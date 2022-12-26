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

module.exports = {
    cryptoTransferFunction
}
