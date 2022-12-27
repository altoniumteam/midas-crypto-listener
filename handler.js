const fetch = require('node-fetch');
const { DynamoDB } = require("aws-sdk");
const { handleResponse } = require('./handleResponse');
const { sendWebsocketMessage } = require('./ws');
const { invoke } = require('./invoke');
const { sendMessage } = require('./sqs');
const {
  etherumTransferFunction,
  bitcoinTransferFunction,
  dogeTransferFunction
} = require('./transfer');
const docClient = new DynamoDB.DocumentClient();

const JournalUrl = process.env.JournalUrl;

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
  try {
    const success = await fetch(
      `https://api.tatum.io/v3/ethereum/wallet/priv`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.api_key
        },
        body: JSON.stringify({
            index: Number(index),
            mnemonic: process.env.MNEMONIC
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

    const payloadGetBlockchainFee = {
      chain: event.currency,
      toAddress: event.currency == 'DOGE' ? 'nZTAE8pngN8aPwdqN9EyoBXb5kxQrQzemi' : event.currency == 'BTC' ? 'tb1q9rhklhqdapu9jpk79ul33kecgfg8k6w49l37h0' : '0x03f2cB9D7beDaCD13B4c993aa205c511B2e1d9Fc',
      value: Number(event.amount),
      brandUsername: brandUsernameData.Item.brandUsername
    }

    console.log('PAYLOAD BLOCKCHAIN FEE: ' + JSON.stringify(payloadGetBlockchainFee));

    const blockchainFeeInvoke = await invoke('midas-player-backend-dev-getBlockchainFees', payloadGetBlockchainFee)

    const feeParse = JSON.parse(blockchainFeeInvoke.Payload);

    const feeBody = JSON.parse(feeParse.body)

    console.log(JSON.stringify(feeBody));

    let gasP, countFee;

    switch(event.currency) {
      case 'ETH':
        gasP = feeBody.estimations.standard
        countFee = Number(feeBody.gasLimit) * Number(gasP);
        break;
      case 'BSC':
        gasP = feeBody.gasPrice
        countFee = Number(feeBody.gasLimit) * Number(gasP);
        break;
      case 'BTC' || 'DOGE':
        gasP = feeBody.medium
        break;
      default:
        break;
    }

    const finalFee = event.currency == 'DOGE' || event.currency == 'BTC' ? Number(gasP) : Number(countFee) / 1000000000;
    const setAmount = Number(event.amount) - Number(finalFee)

    const pk = await getPrivateKey(brandUsernameData.Item.derivationKey);

    console.log(`pk: ${JSON.stringify(pk)}`);

    let transferData;
    
    switch(event.currency) {
      case 'ETH' || 'BSC':
        transferData = {
          chain: event.currency,
          amount: setAmount.toString(),
          pk: pk.key,
          fee: {
            gasLimit: feeBody.gasLimit,
            gasPrice: gasP
          }
        }
        await etherumTransferFunction(transferData);
        break;
      case 'BTC':
        transferData = {
          chain: event.currency,
          amount: setAmount.toString(),
          fromAddress: event.address,
          pk: pk.key,
          fee: gasP.toString()
        }
        await bitcoinTransferFunction(transferData);
        break;
      case 'DOGE':
        transferData = {
          chain: event.currency,
          fromAmount: event.amount,
          toAmount: setAmount.toString(),
          fromAddress: event.address,
          derivationKey: brandUsernameData.Item.derivationKey,
          blockHash: event.blockHash,
          pk: pk.key,
          fee: gasP.toString()
        }  
        await dogeTransferFunction(transferData);      
        break;
      default:
        break;            
    }    

    const payloadUpdateBalance = {
      attribute1: 'transferIn',
      amount: Number(event.amount),
      chain: event.currency,
      brandUsername: brandUsernameData.Item.brandUsername,
      createdAt: new Date().toISOString(),
    }

    let toAddressSend;

    switch(event.currency) {
      case 'ETH' || 'BSC':
        toAddressSend = process.env.addressToETH
        break;
      case 'BTC':
        toAddressSend = process.env.addressToBTC
        break;
      case 'DOGE':
        toAddressSend = process.env.addressToDOGE
        break;
      default:
        break;
    }

    const payloadQueue = {
      type: 'transferIn',
      brandUsername: brandUsernameData.Item.brandUsername,
      fromAddress: event.address,
      toAddress: toAddressSend,
      amount: Number(event.amount),
      fee: Number(finalFee),
      amountTransferred: Number(setAmount),
      currency: event.currency,
      userDerivationKey: brandUsernameData.Item.derivationKey,
      createdAt: new Date().toISOString()
    }

    const sqsMessage = await sendMessage({
      url: JournalUrl,
      payload: JSON.stringify(payloadQueue),
    });

    console.log('SQS: ' + JSON.stringify(sqsMessage));

    console.log('PAYLOAD UPDATE BALANCE: ' + JSON.stringify(payloadUpdateBalance));

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