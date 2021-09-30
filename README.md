# Disclaimer
This is a reference implementation which tries to show how to integrate Paypal-Express into Shopware-PWA.  
This is not a plug'n'play solution and won't be actively maintained at this point.  
It's also not installable at this point, but we may add it in the future.

# Description
## PaypalExpressButton component
This renders the Paypal-Express Button, you can use it everywhere you want and also use multiple instances.  
### props
#### paypalClientId
You need to pass the Paypal Client-ID, which is currently NOT fetched from the backend.
#### isProductPage
Set this to true when you include the component on a product detail page. Like this, only this product will be
added to the cart and Express Checkout will start immediately.  
Default-Value is false, which means that the current cart will be used for checkout. This is useful e.g. to include the button
in the cart.
#### styleOptions
Style-Options for the Express-Button. See https://developer.paypal.com/docs/checkout/integration-features/customize-button/ 

## Composable usePaypalExpress.ts
Encapsulates the logic necessary for the PaypalExpressButton

## page/confirm.vue component
Reference implementation for the confirm page that the user gets redirected to after completing the payment-process on the paypal-side
