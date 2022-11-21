const fetch = require('node-fetch');
const { DynamoDB } = require("aws-sdk");
const { handleResponse } = require('./handleResponse');
const { sendWebsocketMessage } = require('./ws');
const { invoke } = require('./invoke');
const { cryptoTransferVirutalAccountFunction } = require('./transfer');
const docClient = new DynamoDB.DocumentClient();

const getUserById = async (props) => {
  console.log("getUserById props: ", props);

  let brandUsername;
  if (typeof props === "object") {
    brandUsername = props.brandId + "-" + props.username;
  } else {
    brandUsername = props;
  }

  const params = {
    TableName: "midasUser",
    Key: {
      brandUsername: brandUsername,
    },
  };
  console.log("Get User Param: ", params);

  try {
    const data = await docClient.get(params).promise();
    console.log("USER DB RETURN:", data);
    return data;
  } catch (err) {
    return err;
  }
};

const getCryptoBalance = async(brandUsername) => {
  try{
    const userWallet = await getUserById(brandUsername);
    let balance = {};
    for(let x in userWallet.Item.blockchainWallet){
      const resp = await fetch(
        `https://api.tatum.io/v3/ledger/account/${userWallet.Item.blockchainWallet[x].id}/balance`,
        {
          method: 'GET',
          headers: {
            'x-api-key': process.env.api_key
          }
        }
      );
      const balanceData = await resp.json();
      balance[x] = balanceData.availableBalance;
    }
    return balance;
  }catch(err){
    return Promise.reject(err);
  }
}

const updateCryptoBalance = async (brandUsername, currency, amount) => {
  console.log('brandUsername: ', brandUsername);
  console.log('currency: ', currency);
  console.log('amount: ', amount);
  const params = {
    TableName: 'midasUser',
    Key: {
      brandUsername: ''
    },
    UpdateExpression:
        `set cryptoBalance.${currency}.currentBalance = :a`,
    ExpressionAttributeValues: {
        ':a': 0,
    },
    ReturnValues: "UPDATED_NEW"
  }

  params.Key.brandUsername = brandUsername;
  params.ExpressionAttributeValues[":a"] = amount;

  try {
    await docClient.update(params).promise();    
  } catch (error) {
    console.log(error);
    Promise.reject(error);
  }
};

// const cryptoSubscription = async (event) => {
//   console.log(event);
//   const a = Object.values(event.blockchainWallet);
//   console.log(a);
//   console.log('running...');
//   try {
//     const c = [];
//     for ( let i = 0; i < a.length; i++ ) {
//       const success = await fetch(
//         `https://api.tatum.io/v3/subscription`,
//         {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             'x-api-key': process.env.api_key
//           },
//           body: JSON.stringify({
//             type: 'ADDRESS_TRANSACTION',
//             attr: {
//               address: a[i].address,
//               chain: a[i].currency,
//               url: process.env.webhook
//             }
//           })
//         }
//       );

//       const dataIncoming = await success.json();
//       console.log('dataIncoming: ', JSON.stringify(dataIncoming));
//       c.push(dataIncoming.id);     
//     }      
    
//     const result = {
//       event,
//       incomingSubs: c,
//     }

//     console.log(result);

//     handleResponse(result)
//   } catch (error) {
//     console.log(error);
//     handleResponse(null, 500, error);
//   }
// };

// const cryptoManualSubscription = async (address, chain) => {
//   console.log('masuk manual subs')
//   const query = new URLSearchParams({pageSize: '50', address: address}).toString();
//   const resp = await fetch(
//     `https://api.tatum.io/v3/subscription?${query}`,
//     {
//       method: 'GET',
//       headers: {
//         'x-api-key': process.env.api_key
//       }
//     }
//   );

//   const data = await resp.text();
  
//   const activeSubsId = JSON.parse(data);
//   console.log(activeSubsId[0].id);
//   await fetch(
//     `https://api.tatum.io/v3/subscription/${activeSubsId[0].id}`,
//     {
//       method: 'DELETE',
//       headers: {
//         'x-api-key': process.env.api_key
//       }
//     }
//   );

//   console.log('deleted id: ' + activeSubsId[0].id);

//   const subs = await fetch(
//     `https://api.tatum.io/v3/subscription`,
//     {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'x-api-key': process.env.api_key
//       },
//       body: JSON.stringify({
//         type: 'ADDRESS_TRANSACTION',
//         attr: {
//           address: address,
//           chain: chain,
//           url: process.env.webhook
//         }
//       })
//     }
//   );

//   const dataIncoming = await subs.json();
//   console.log('new subs id: ', JSON.stringify(dataIncoming));
// }

const notificationTrapper = async (event) => {
  console.log(event);
  // get ws connection //
  const params = {
    TableName: 'midasUserBlockchainAddress',
    Key: {
      address: event.address,
    },
  }

  const brandUsernameData = await docClient.get(params).promise();
  console.log(brandUsernameData);

  try {
    const latestBalance = await getCryptoBalance(brandUsernameData.Item.brandUsername);
    console.log(latestBalance);

    const paramsWebSocket = {
      TableName: 'midasUser',
      Key: {
        brandUsername: brandUsernameData.Item.brandUsername
      }
    }

    const { Item } = await docClient.get(paramsWebSocket).promise();

    console.log({
      a: event.currency, b: event.accountId, c: event.amount
    })

    await cryptoTransferVirutalAccountFunction(event.currency, event.accountId, event.amount);

    const payload = {
      attribute1: 'transferIn',
      amount: Number(event.amount),
      chain: event.currency,
      brandUsername: brandUsernameData.Item.brandUsername
    }

    console.log('PAYLOAD: ' + JSON.stringify(payload));

    const { Payload } = await invoke(payload);

    const payloadParse = JSON.parse(Payload);

    const { newResult: c } = payloadParse;
    console.log(c);
    console.log(JSON.stringify(c));
    console.log('yang dibutuhkan: ' + c.cryptoBalance[event.currency])

    await updateCryptoBalance(brandUsernameData.Item.brandUsername, event.currency, c.cryptoBalance[event.currency]);

    const wsMessage = {
      MAIN: c.currentBalance, 
      BONUS: c.bonusCurrentBalance,
      BTC: c.cryptoBalance['BTC'],
      ETH: c.cryptoBalance['ETH'],
      DOGE: c.cryptoBalance['DOGE'],
      BSC: c.cryptoBalance['BSC'],
      SHIB: c.cryptoBalance['SHIB']
    }

    console.log(wsMessage)

    await sendWebsocketMessage(Item.userWebsocket.wsConnectionId, JSON.stringify(wsMessage));
  } catch (error) {
    console.log(error);
    handleResponse(null, 500, error);    
  }  
};

module.exports = {
  notificationTrapper
}