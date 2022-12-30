const fetch = require('node-fetch');
const { DynamoDB } = require("aws-sdk");
const { handleResponse } = require('./handleResponse');
const { sendWebsocketMessage } = require('./ws');
const { invoke } = require('./invoke');
const { sendMessage } = require('./sqs');
const docClient = new DynamoDB.DocumentClient();

const CryptoManagerUrl = process.env.CryptoManagerUrl;

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

const getPrivateKey = async (index) => {
  const { indexNumber, currency } = index;
  let chain, mnemonic;
  switch (currency) {
    case 'ETH':
      chain = 'ethereum'
      mnemonic = process.env.MNEMONIC_ETH
      break;
    case 'BSC':
      chain = 'bsc'
      mnemonic = process.env.MNEMONIC_ETH
      break;
    case 'BTC':
      chain = 'bitcoin'
      mnemonic = process.env.MNEMONIC_BTC
      break;
    case 'DOGE':
      chain = 'dogecoin'
      mnemonic = process.env.MNEMONIC_DOGE
      break;
    case 'USDT':
      chain = 'ethereum'
      mnemonic = process.env.MNEMONIC_ETH
      break;
    case 'SHIB':
      chain = 'ethereum'
      mnemonic = process.env.MNEMONIC_ETH
      break;
    case 'IDRT':
      chain = 'ethereum'
      mnemonic = process.env.MNEMONIC_ETH
      break;
    case 'BIDR':
      chain = 'bsc'
      mnemonic = process.env.MNEMONIC_ETH      
      break;
    default:
      break;
  }
  try {
    const success = await fetch(
      `https://api.tatum.io/v3/${chain}/wallet/priv`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.api_key
        },
        body: JSON.stringify({
            index: Number(indexNumber),
            mnemonic: mnemonic
        })
      }
    );
    
    const data = await success.json();      
    
    return data;
  } catch (error) {
    console.log(error);
    handleResponse(null, 500, error);
  }
};

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
  switch(event.currency) {
    case 'USDTF':
      event.currency = 'USDT'
      break;
    case 'SHIBAF':
      event.currency = 'SHIB'
      break;
    case 'BIDR':
      event.currency = 'BIDR'
      break;
    case 'IDRT':
      event.currency = 'IDRT'
      break;
    default:
      break;  
  }

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
      a: event.currency, b: event.address, c: event.amount
    })

    const pkData = {
      indexNumber: brandUsernameData.Item.derivationKey,
      currency: event.currency
    }
    const pk = await getPrivateKey(pkData);

    console.log(`pk: ${JSON.stringify(pk)}`);
    
    const cryptoManagerData = {
      currency: event.currency, 
      amount: event.amount,
      brandUsername: brandUsernameData.Item.brandUsername,
      address: event.address, 
      derivationKey: brandUsernameData.Item.derivationKey, 
      blockHash: event.blockHash,
      pk: pk.key
    }

    const sqsCryptoManager = await sendMessage({
      url: CryptoManagerUrl,
      payload: JSON.stringify(cryptoManagerData),      
    })

    console.log('crypto manager: ' + JSON.stringify(sqsCryptoManager));

    const payloadUpdateBalance = {
      attribute1: 'transferIn',
      amount: Number(event.amount),
      chain: event.currency,
      brandUsername: brandUsernameData.Item.brandUsername,
      createdAt: new Date().toISOString(),
    }

    console.log('Payload Update Balance: ' + JSON.stringify(payloadUpdateBalance));

    const updateBalanceInvoke = await invoke('midasWalletService2-dev-updateBalance', payloadUpdateBalance);

    const updateBalanceParse = JSON.parse(updateBalanceInvoke.Payload);

    const { newResult: c } = updateBalanceParse;
    console.log(c);
    console.log(JSON.stringify(c));
    console.log('yang dibutuhkan: ' + c.cryptoBalance[event.currency])

    await updateCryptoBalance(brandUsernameData.Item.brandUsername, event.currency, c.cryptoBalance[event.currency]);

    const wsMessage = {
      brandUsername: c.brandUsername,
      activeWallet: c.activeWallet,
      walletBalance: {
        MAIN: {
          currentBalance: c.currentBalance,
          currencyName: 'MAIN',
          type: 'FIAT'
        },
        BONUS: {
          currentBalance: c.currentBalance,
          currencyName: 'BONUS',
          type: 'FIAT'              
        },
        BTC: {
          currentBalance: c.cryptoBalance["BTC"],
          currencyName: 'BTC',
          type: 'CRYPTO'          
        },
        ETH: {
          currentBalance: c.cryptoBalance["ETH"],
          currencyName: 'ETH',
          type: 'CRYPTO'              
        },
        DOGE: {
          currentBalance: c.cryptoBalance["DOGE"],
          currencyName: 'DOGE',
          type: 'CRYPTO'
        },
        BSC: {
          currentBalance: c.cryptoBalance["BSC"],
          currencyName: 'BSC',
          type: 'CRYPTO'
        },
        SHIB: {
          currentBalance: c.cryptoBalance["SHIB"],
            currencyName: 'SHIB',
          type: 'CRYPTO'             
        },
        USDT: {
          currentBalance: c.cryptoBalance["USDT"],
          currencyName: 'USDT',
          type: 'CRYPTO'             
        },
        IDRT: {
          currentBalance: c.cryptoBalance["IDRT"],
          currencyName: 'IDRT',
          type: 'CRYPTO'             
        },
        BIDR: {
          currentBalance: c.cryptoBalance["BIDR"],
          currencyName: 'BIDR',
          type: 'CRYPTO'             
        },        
      }
    };    

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