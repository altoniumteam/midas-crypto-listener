const fetch = require('node-fetch');

const cryptoTransferFunction = async (payload) => {
    let currency;
    switch(payload.chain) {
        case 'ETH':
            currency = 'ethereum';
            break;
        case 'BSC':
            currency = 'bsc';
            break;
        default:
            break;
    }
    try {
        const resp = await fetch(
        `https://api.tatum.io/v3/${currency}/transaction`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.api_key
            },
            body: JSON.stringify({
                to: '0xB4A059Fb99CF16F5AB2A5aE20ca2Ed94C27DD0d4',
                currency: payload.chain,
                amount: payload.amount,
                fromPrivateKey: payload.pk,
                fee: payload.fee
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
    cryptoTransferFunction,
    checkExistBlock
}
