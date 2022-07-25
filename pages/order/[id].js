import React, {
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import Layout from '../../components/Layout';
import { Store } from '../../utils/Store';
import NextLink from 'next/link';
import Image from 'next/image';
import {
  Grid,
  TableContainer,
  Table,
  Typography,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Link,
  CircularProgress,
  Button,
  Card,
  List,
  ListItem,
  Box,
} from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/router';
import classes from '../../utils/classes';
import { useSnackbar } from 'notistack';
import { getError } from '../../utils/error';
import {
  // PayPalButtons,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js';

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return {
        ...state,
        loading: true,
        error: '',
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        order: action.payload,
        error: '',
      };
    case 'FETCH_FAIL':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'PAY_REQUEST':
      return { ...state, loadingPay: true };
    case 'PAY_SUCCESS':
      return {
        ...state,
        loadingPay: false,
        successPay: true,
      };
    case 'PAY_FAIL':
      return {
        ...state,
        loadingPay: false,
        errorPay: action.payload,
      };
    case 'PAY_RESET':
      return {
        ...state,
        loadingPay: false,
        successPay: false,
        errorPay: '',
      };
    case 'DELIVER_REQUEST':
      return { ...state, loadingDeliver: true };
    case 'DELIVER_SUCCESS':
      return {
        ...state,
        loadingDeliver: false,
        successDeliver: true,
      };
    case 'DELIVER_FAIL':
      return {
        ...state,
        loadingDeliver: false,
        errorDeliver: action.payload,
      };
    case 'DELIVER_RESET':
      return {
        ...state,
        loadingDeliver: false,
        successDeliver: false,
        errorDeliver: '',
      };
    default:
      state;
  }
}

function Order({ params }) {
  const orderId = params.id;
  const [{ isPending }, paypalDispatch] =
    usePayPalScriptReducer();

  const router = useRouter();
  const { state } = useContext(Store);
  const { userInfo } = state;
  const [signiture, setSigniture] = useState('');

  const [
    {
      loading,
      error,
      order,
      successPay,
      loadingDeliver,
      successDeliver,
    },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    order: {},
    error: '',
  });
  const {
    shippingAddress,
    paymentMethod,
    orderItems,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    isPaid,
    paidAt,
    isDelivered,
    deliveredAt,
  } = order;

  useEffect(() => {
    if (!userInfo) {
      return router.push('/login');
    }
    const fetchOrder = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get(
          `/api/orders/${orderId}`,
          {
            headers: {
              authorization: `Bearer ${userInfo.token}`,
            },
          }
        );
        dispatch({
          type: 'FETCH_SUCCESS',
          payload: data,
        });
      } catch (err) {
        dispatch({
          type: 'FETCH_FAIL',
          payload: getError(err),
        });
      }
    };
    if (
      !order._id ||
      successPay ||
      successDeliver ||
      (order._id && order._id !== orderId)
    ) {
      fetchOrder();
      if (successPay) {
        dispatch({ type: 'PAY_RESET' });
      }
      if (successDeliver) {
        dispatch({ type: 'DELIVER_RESET' });
      }
    } else {
      const loadPaypalScript = async () => {
        const { data: clientId } =
          await axios.get('/api/keys/paypal', {
            headers: {
              authorization: `Bearer ${userInfo.token}`,
            },
          });
        paypalDispatch({
          type: 'resetOptions',
          value: {
            'client-id': clientId,
            currency: 'USD',
          },
        });
        paypalDispatch({
          type: 'setLoadingStatus',
          value: 'pending',
        });
      };
      loadPaypalScript();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, successPay, successDeliver]);
  const { enqueueSnackbar } = useSnackbar();

  // function createOrder(data, actions) {
  //   return actions.order
  //     .create({
  //       purchase_units: [
  //         {
  //           amount: { value: totalPrice },
  //         },
  //       ],
  //     })
  //     .then((orderID) => {
  //       return orderID;
  //     });
  // }
  // function onApprove(data, actions) {
  //   return actions.order
  //     .capture()
  //     .then(async function (details) {
  //       try {
  //         dispatch({ type: 'PAY_REQUEST' });
  //         const { data } = await axios.put(
  //           `/api/orders/${order._id}/pay`,
  //           details,
  //           {
  //             headers: {
  //               authorization: `Bearer ${userInfo.token}`,
  //             },
  //           }
  //         );
  //         dispatch({
  //           type: 'PAY_SUCCESS',
  //           payload: data,
  //         });
  //         enqueueSnackbar('Order is paid', {
  //           variant: 'success',
  //         });
  //       } catch (err) {
  //         dispatch({
  //           type: 'PAY_FAIL',
  //           payload: getError(err),
  //         });
  //         enqueueSnackbar(getError(err), {
  //           variant: 'error',
  //         });
  //       }
  //     });
  // }

  // function onError(err) {
  //   enqueueSnackbar(getError(err), {
  //     variant: 'error',
  //   });
  // }

  async function deliverOrderHandler() {
    try {
      dispatch({ type: 'DELIVER_REQUEST' });
      const { data } = await axios.put(
        `/api/orders/${order._id}/deliver`,
        {},
        {
          headers: {
            authorization: `Bearer ${userInfo.token}`,
          },
        }
      );
      dispatch({
        type: 'DELIVER_SUCCESS',
        payload: data,
      });
      enqueueSnackbar('Order is delivered', {
        variant: 'success',
      });
    } catch (err) {
      dispatch({
        type: 'DELIVER_FAIL',
        payload: getError(err),
      });
      enqueueSnackbar(getError(err), {
        variant: 'error',
      });
    }
  }

  // Payfast Integration
  const crypto = require('crypto');

  const myData = [];
  // Merchant details
  myData['merchant_id'] = '10000100';
  myData['merchant_key'] = '46f0cd694581a';
  myData[
    'return_url'
  ] = `http://www.shop.ajkitsune.co.za/order/${orderId}`;
  myData[
    'cancel_url'
  ] = `http://www.shop.ajkitsune.co.za/order/${orderId}`;
  myData[
    'notify_url'
  ] = `http://www.shop.ajkitsune.co.za/api/orders/${orderId}/pay`;
  // Buyer details
  myData['name_first'] = String(userInfo.name);
  myData['email_address'] = String(
    userInfo.email
  );
  // Transaction details
  myData['amount'] = String(totalPrice);
  myData['item_name'] = String(orderId);

  console.log(myData);

  const generateSignature = (
    data,
    passPhrase = null
  ) => {
    // Create parameter string
    let pfOutput = '';
    for (let key in data) {
      // eslint-disable-next-line no-prototype-builtins
      if (data.hasOwnProperty(key)) {
        if (data[key] !== '') {
          pfOutput += `${key}=${encodeURIComponent(
            data[key].trim()
          ).replace(/%20/g, '+')}&`;
        }
      }
    }

    // Remove last ampersand
    let getString = pfOutput.slice(0, -1);
    if (passPhrase !== null) {
      getString += `&passphrase=${encodeURIComponent(
        passPhrase.trim()
      ).replace(/%20/g, '+')}`;
    }

    return crypto
      .createHash('md5')
      .update(getString)
      .digest('hex');
  };

  // Generate signature
  myData['signiture'] = signiture;

  function onPay() {
    const newSig = generateSignature(myData);
    setSigniture(newSig);
  }

  return (
    <Layout title={`Order ${orderId}`}>
      <Typography component="h1" variant="h1">
        Order {orderId}
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography sx={classes.error}>
          {error}
        </Typography>
      ) : (
        <Grid container spacing={1}>
          <Grid item md={9} xs={12}>
            <Card sx={classes.section}>
              <List>
                <ListItem>
                  <Typography
                    component="h2"
                    variant="h2"
                  >
                    Shipping Address
                  </Typography>
                </ListItem>
                <ListItem>
                  {shippingAddress.fullName},{' '}
                  {shippingAddress.address},{' '}
                  {shippingAddress.city},{' '}
                  {shippingAddress.postalCode},{' '}
                  {shippingAddress.country}
                  &nbsp;
                  {shippingAddress.location && (
                    <Link
                      variant="button"
                      target="_new"
                      href={`https://maps.google.com?q=${shippingAddress.location.lat},${shippingAddress.location.lng}`}
                    >
                      Show On Map
                    </Link>
                  )}
                </ListItem>
                <ListItem>
                  Status:{' '}
                  {isDelivered
                    ? `delivered at ${deliveredAt}`
                    : 'not delivered'}
                </ListItem>
              </List>
            </Card>
            <Card sx={classes.section}>
              <List>
                <ListItem>
                  <Typography
                    component="h2"
                    variant="h2"
                  >
                    Payment Method
                  </Typography>
                </ListItem>
                <ListItem>
                  {paymentMethod}
                </ListItem>
                <ListItem>
                  Status:{' '}
                  {isPaid
                    ? `paid at ${paidAt}`
                    : 'not paid'}
                </ListItem>
              </List>
            </Card>
            <Card sx={classes.section}>
              <List>
                <ListItem>
                  <Typography
                    component="h2"
                    variant="h2"
                  >
                    Order Items
                  </Typography>
                </ListItem>
                <ListItem>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            Image
                          </TableCell>
                          <TableCell>
                            Name
                          </TableCell>
                          <TableCell align="right">
                            Quantity
                          </TableCell>
                          <TableCell align="right">
                            Price
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {orderItems.map(
                          (item) => (
                            <TableRow
                              key={item._id}
                            >
                              <TableCell>
                                <NextLink
                                  href={`/product/${item.slug}`}
                                  passHref
                                >
                                  <Link>
                                    <Image
                                      src={
                                        item.image
                                      }
                                      alt={
                                        item.name
                                      }
                                      width={50}
                                      height={50}
                                    ></Image>
                                  </Link>
                                </NextLink>
                              </TableCell>

                              <TableCell>
                                <NextLink
                                  href={`/product/${item.slug}`}
                                  passHref
                                >
                                  <Link>
                                    <Typography>
                                      {item.name}
                                    </Typography>
                                  </Link>
                                </NextLink>
                              </TableCell>
                              <TableCell align="right">
                                <Typography>
                                  {item.quantity}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography>
                                  R{item.price}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </ListItem>
              </List>
            </Card>
          </Grid>
          <Grid item md={3} xs={12}>
            <Card sx={classes.section}>
              <List>
                <ListItem>
                  <Typography variant="h2">
                    Order Summary
                  </Typography>
                </ListItem>
                <ListItem>
                  <Grid container>
                    <Grid item xs={6}>
                      <Typography>
                        Items:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography align="right">
                        R{itemsPrice}
                      </Typography>
                    </Grid>
                  </Grid>
                </ListItem>
                <ListItem>
                  <Grid container>
                    <Grid item xs={6}>
                      <Typography>
                        Tax:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography align="right">
                        R{taxPrice}
                      </Typography>
                    </Grid>
                  </Grid>
                </ListItem>
                <ListItem>
                  <Grid container>
                    <Grid item xs={6}>
                      <Typography>
                        Shipping:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography align="right">
                        R{shippingPrice}
                      </Typography>
                    </Grid>
                  </Grid>
                </ListItem>
                <ListItem>
                  <Grid container>
                    <Grid item xs={6}>
                      <Typography>
                        <strong>Total:</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography align="right">
                        <strong>
                          R{totalPrice}
                        </strong>
                      </Typography>
                    </Grid>
                  </Grid>
                </ListItem>
                {!isPaid && (
                  <ListItem>
                    {isPending ? (
                      <CircularProgress />
                    ) : (
                      <Box sx={classes.fullWidth}>
                        {/* <PayPalButtons
                          createOrder={
                            createOrder
                          }
                          onApprove={onApprove}
                          onError={onError}
                        ></PayPalButtons> */}
                        <form
                          action="https://sandbox.payfast.co.za/eng/process"
                          method="POST"
                        >
                          {' '}
                          <p>Hello</p>
                          <input
                            name="merchant_id"
                            type="hidden"
                            value={
                              myData[
                                'merchant_id'
                              ]
                            }
                          />
                          <input
                            name="merchant_key"
                            type="hidden"
                            value={
                              myData[
                                'merchant_key'
                              ]
                            }
                          />
                          <input
                            name="return_url"
                            type="hidden"
                            value={
                              myData['return_url']
                            }
                          />
                          <input
                            name="cancel_url"
                            type="hidden"
                            value={
                              myData['cancel_url']
                            }
                          />
                          <input
                            name="notify_url"
                            type="hidden"
                            value={
                              myData['notify_url']
                            }
                          />
                          <input
                            name="name_first"
                            type="hidden"
                            value={
                              myData['name_first']
                            }
                          />
                          <input
                            name="email_address"
                            type="hidden"
                            value={
                              myData[
                                'email_address'
                              ]
                            }
                          />
                          <input
                            name="amount"
                            type="hidden"
                            value={
                              myData['amount']
                            }
                          />
                          <input
                            name="item_name"
                            type="hidden"
                            value={
                              myData['item_name']
                            }
                          />
                          <input
                            name="signiture"
                            type="hidden"
                            value={
                              myData['signiture']
                            }
                          />
                          <input
                            onClick={onPay}
                            type="submit"
                            value="Pay Now"
                          />
                        </form>
                      </Box>
                    )}
                  </ListItem>
                )}
                {userInfo.isAdmin &&
                  order.isPaid &&
                  !order.isDelivered && (
                    <ListItem>
                      {loadingDeliver && (
                        <CircularProgress />
                      )}
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        onClick={
                          deliverOrderHandler
                        }
                      >
                        Deliver Order
                      </Button>
                    </ListItem>
                  )}
              </List>
            </Card>
          </Grid>
        </Grid>
      )}
    </Layout>
  );
}

export async function getServerSideProps({
  params,
}) {
  return { props: { params } };
}

export default dynamic(
  () => Promise.resolve(Order),
  { ssr: false }
);
