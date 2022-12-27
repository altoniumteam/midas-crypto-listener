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
                to: '0x03f2cB9D7beDaCD13B4c993aa205c511B2e1d9Fc',
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
                        address: 'tb1q9rhklhqdapu9jpk79ul33kecgfg8k6w49l37h0', //master btc
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
                        txHash: '53faa103e8217e1520f5149a4e8c84aeb58e55bdab11164a95e69a8ca50f8fcc',
                        value: payload.amount,
                        address: payload.address,
                        index: payload.derivationKey,
                        privateKey: payload.pk
                    }
                ],
                to: [
                    {
                        address: '2MzNGwuKvMEvKMQogtgzSqJcH2UW3Tc5oc7',
                        value: 0.02969944
                    }
                ]
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
