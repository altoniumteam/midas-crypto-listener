const fetch = require('node-fetch');

const cryptoTransferVirutalAccountFunction = async (currency, id, amount) => {
    let recipientId;

    if (currency == 'BTC') {
        recipientId = '637708010a234644f45c4759'
    }

    if (currency == 'ETH') {
        recipientId = '639c3f34680156c397207786'
    }

    if (currency == 'DOGE') {
        recipientId
    }

    if (currency == 'BSC') {
        recipientId
    }

    console.log('RECIPIENT ID: ' + recipientId)
    console.log(currency, id, amount);

    try {
        const resp = await fetch(
        `https://api.tatum.io/v3/ledger/transaction`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.api_key
            },
            body: JSON.stringify({
                senderAccountId: id,
                recipientAccountId: recipientId,
                amount: amount
            })
        }
        );

        const data = await resp.json();
        console.log(data);

    } catch (error) {
        Promise.reject(`Error: ${error}`);
    }
};

const checkExistBlock = async (crypto, hash) => {
    console.log(crypto)
    console.log(hash)
    let chain;
    if (crypto === 'ETH') {
        chain = 'ethereum'
    }
    // midasUSDT
    if (crypto === '0xa74a3bbfe97ecaa9024ebbd5e933b19d5952d1b6') {
        chain = 'ethereum'
    }
    if (crypto === 'BNB') {
        chain = 'bsc'
    }
    if (crypto === 'DOGE') {
        chain = 'dogecoin'
    }
    if (crypto === 'BTC') {
        chain = 'bitcoin'
    }

    if (chain == 'bitcoin') {
        console.log('MASUK BTC')
        const resp = await fetch(
            `https://api.tatum.io/v3/${chain}/block/hash/${hash}`,
            {
                method: 'GET',
                headers: {
                    'x-api-key': process.env.api_key
                }
            }
        );

        const data = await resp.text();
        console.log(data);
        const result = JSON.parse(data);

        if (result.statusCode == 404) {
            return false;
        } else {
            return true;
        }
    } else {
        console.log('MASUK SELAIN BTC')
        const resp = await fetch(
            `https://api.tatum.io/v3/${chain}/block/${hash}`,
            {
                method: 'GET',
                headers: {
                    'x-api-key': process.env.api_key
                }
            }
        );
    
        const data = await resp.text();
        console.log(data);
        const result = JSON.parse(data);
        if (result.statusCode == 404) {
            return false;
        } else {
            return true;
        }        
    }
}

module.exports = {
    cryptoTransferVirutalAccountFunction,
    checkExistBlock
}
