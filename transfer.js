const fetch = require('node-fetch');

const etherumTransferFunction = async (payload) => {
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
                to: process.env.addressToETH,
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

const bitcoinTransferFunction = async (payload) => {
    try {
        const resp = await fetch(
        `https://api.tatum.io/v3/bitcoin/transaction`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.api_key
            },
            body: JSON.stringify({
                fromAddress: [
                    {
                        address: payload.fromAddress,
                        privateKey: payload.pk
                    }
                ],
                to: [
                    {
                        address: process.env.addressToBTC, //master btc
                        value: payload.amount
                    }
                ],
                fee: payload.fee,
                changeAddress: 'tb1qax8pyl85jve90j6ql2xwmytzayn5ehln4l2d6f' //2nd master btc
            })
        }
        );

        const data = await resp.json();
        console.log(data);

    } catch (error) {
        Promise.reject(`Error: ${error}`);
    }
};

const dogeTransferFunction = async (payload) => {
    try {
        const resp = await fetch(
        `https://api.tatum.io/v3/dogecoin/transaction`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.api_key
            },
            body: JSON.stringify({
                fromUTXO: [
                    {
                        txHash: payload.blockHash,
                        value: payload.fromAmount,
                        address: payload.fromAddress,
                        index: payload.derivationKey,
                        privateKey: payload.pk
                    }
                ],
                to: [
                    {
                        address: process.env.addressToDOGE,
                        value: payload.toAmount
                    }
                ],
                fee: payload.fee,
                changeAddress: 'nVTfXfUeB6cjQuDm4CqXsj1P1MbrDaBts5'
            })
        }
        );

        const data = await resp.json();
        console.log(data);

    } catch (error) {
        Promise.reject(`Error: ${error}`);
    }
};

module.exports = {
    etherumTransferFunction,
    bitcoinTransferFunction,
    dogeTransferFunction
}
