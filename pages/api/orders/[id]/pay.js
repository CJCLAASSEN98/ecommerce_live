import nc from 'next-connect';
import Order from '../../../../models/Order';
import db from '../../../../utils/db';
import onError from '../../../../utils/error';
import { isAuth } from '../../../../utils/auth';

const handler = nc({
  onError,
});
handler.use(isAuth);
handler.put(async (req, res) => {
  const dns = require('dns');

  async function ipLookup(domain) {
    return new Promise((resolve, reject) => {
      dns.lookup(
        domain,
        { all: true },
        // eslint-disable-next-line no-unused-vars
        (err, address, family) => {
          if (err) {
            reject(err);
          } else {
            const addressIps = address.map(
              function (item) {
                return item.address;
              }
            );
            resolve(addressIps);
          }
        }
      );
    });
  }
  const axios = require('axios');
  const crypto = require('crypto');

  const testingMode = true;
  const pfHost = testingMode
    ? 'sandbox.payfast.co.za'
    : 'www.payfast.co.za';

  const pfData = JSON.parse(
    JSON.stringify(req.body)
  );

  let pfParamString = '';
  for (let key in pfData) {
    if (
      // eslint-disable-next-line no-prototype-builtins
      pfData.hasOwnProperty(key) &&
      key !== 'signiture'
    ) {
      pfParamString += `${key}=${encodeURIComponent(
        pfData[key].trim().replace(/%20/g, '+')
      )}&`;
    }
  }

  pfParamString = pfParamString.slice(0, -1);

  //Check Signiture

  const pfValidSigniture = (
    pfData,
    pfParamString,
    pfPassphrase = null
  ) => {
    //calculate security signiture
    // eslint-disable-next-line no-unused-vars
    let tempParamString = '';
    if (pfPassphrase !== null) {
      pfParamString += `$passphrase=${encodeURIComponent(
        pfPassphrase.trim()
      ).replace(/%20/g, '+')}`;
    }

    const signiture = crypto
      .createHash('md5')
      .update(pfParamString)
      .digest('hex');

    return pfData['signiture'] === signiture;
  };

  //check if valid payfast domain

  const pfValidIP = async (req) => {
    const validHosts = [
      'www.payfast.co.za',
      'sandbox.payfast.co.za',
      'w1w.payfast.co.za',
      'w2w.payfast.co.za',
    ];

    let validIps = [];
    const pfIp =
      req.headers['x-forwarded-for'] ||
      req.connection;

    try {
      for (let key in validHosts) {
        const ips = await ipLookup(
          validHosts[key]
        );
        validIps = [...validIps, ...ips];
      }
    } catch (err) {
      console.error(err);
    }

    const uniqueIps = [...new Set(validIps)];

    if (uniqueIps.includes(pfIp)) {
      return true;
    }
    return false;
  };

  const orderTotal = order.totalPrice;

  const pfValidPaymentData = (
    orderTotal,
    pfData
  ) => {
    return (
      Math.abs(
        parseFloat(orderTotal) -
          parseFloat(pfData['amount_gross'])
      ) <= 0.01
    );
  };

  const pfValidServerConfirmation = async (
    pfHost,
    pfParamString
  ) => {
    const result = await axios
      .post(
        `https://${pfHost}/eng/query/validate`,
        pfParamString
      )
      .then((res) => {
        return res.data;
      })
      .catch((error) => {
        console.error(error);
      });

    return result === 'VALID';
  };

  await db.connect();
  const order = await Order.findById(
    req.body.item_name
  );

  if (order) {
    const check1 = pfValidSigniture(
      pfData,
      pfParamString
      // passPhrase
    );

    const check2 = pfValidIP(req);

    const check3 = pfValidPaymentData(
      orderTotal,
      pfData
    );

    const check4 = pfValidServerConfirmation(
      pfHost,
      pfParamString
    );

    if (check1 && check2 && check3 && check4) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        email_address: req.body.email_address,
      };
      const paidOrder = await order.save();
      await db.disconnect();
      res.send({
        message: 'order paid',
        order: paidOrder,
      });
    }
  } else {
    await db.disconnect();
    res
      .status(404)
      .send({ message: 'order not found' });
  }
});

export default handler;
