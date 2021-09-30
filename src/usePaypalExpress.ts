import {
  getApplicationContext,
  useCart,
  useCheckout,
  useNotifications,
  useSessionContext,
} from "@shopware-pwa/composables"
import { PaymentMethod } from "@shopware-pwa/commons/interfaces/models/checkout/payment/PaymentMethod"
import { getCheckoutCartEndpoint } from "@shopware-pwa/shopware-6-client"
import { computed, onBeforeMount } from "@vue/composition-api"

declare global {
  interface Window {
    paypal: any
  }
}
interface ExtendedPaymentMethod extends PaymentMethod {
  shortName?: string
}

export const PAGE_EXPRESS_CONFIRM = "/express-checkout/confirm"
export const ENDPOINT_PAYPAL_EXPRESS_CREATE_ORDER =
  "/store-api/paypal/express/create-order"
export const ENDPOINT_PAYPAL_EXPRESS_PREPARE_CHECKOUT =
  "/store-api/paypal/express/prepare-checkout"

/**
 * Kapselung der Paypal-Express Logik in diesem Composable
 */
export const usePaypalExpress = () => {
  const { currency, setPaymentMethod, refreshSessionContext } =
    useSessionContext()
  const { apiInstance, i18n, router } = getApplicationContext({
    contextName: "usePaypalExpress",
  })
  const { refreshCart, addProduct } = useCart()
  const { getPaymentMethods, paymentMethods } = useCheckout()
  const { pushError } = useNotifications()

  const paypalPaymentMethod = computed(() => {
    return paymentMethods.value.find(
      (method: ExtendedPaymentMethod) =>
        method.shortName === "pay_pal_payment_handler"
    )
  })

  onBeforeMount(() => {
    paymentMethods.value.length === 0 && getPaymentMethods()
  })

  const initPaypal = (clientId: string, onLoadCallback: EventListener) => {
    const scriptOptions = new URLSearchParams({
      components: "marks,buttons,messages",
      locale: i18n.locale.replace("-", "_"),
      currency: currency.value?.isoCode,
      intent: "capture",
      commit: "false", // https://developer.paypal.com/docs/checkout/integration-features/update-order-details/#1-update-the-script-tag
    })

    if (!window.paypal) {
      const paypalScript = document.createElement("script")
      paypalScript.type = "text/javascript"
      paypalScript.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&${scriptOptions.toString()}`
      paypalScript.addEventListener("load", onLoadCallback, false)

      document.head.appendChild(paypalScript)
    } else {
      // Emulate Load Event, so that other paypal buttons can be rendered without reloading the script
      onLoadCallback(null)
    }
  }

  /**
   * Gets calls by the Paypal SDK when the Express-Button gets clicked
   */
  const handleCreateOrder = (
    isProductPage: boolean = false,
    productId: string = null
  ): Promise<string> => {
    return new Promise(async (resolve) => {
      // 1) switch payment method in context
      await setPaymentMethod(paypalPaymentMethod.value)
      if (isProductPage) {
        // 2.1) Delete current cart as we just want to buy the product on which page we currently are
        const cartEndpoint = getCheckoutCartEndpoint()
        await apiInstance.invoke.delete(cartEndpoint)

        await refreshCart()
        // 2.2) Add current product
        await addProduct({ id: productId, quantity: 1 })
      }
      // 3) Call Create-Order Endpoint (POST /store-api/paypal/express/create-order) --> token as Response
      const response = await apiInstance.invoke.post(
        ENDPOINT_PAYPAL_EXPRESS_CREATE_ORDER
      )
      return resolve(response.data.token) // Paypal token
    })
  }

  /**
   * Gets called from the Paypal JS-SDK when Paypal approves the payment.
   */
  const handleApprove = async (data) => {
    const requestPayload = {
      token: data.orderID,
    }

    await apiInstance.invoke.post(
      ENDPOINT_PAYPAL_EXPRESS_PREPARE_CHECKOUT,
      requestPayload
    )

    // Reload current context completely. The request before does return a new SessionContextToken, which gets recognized
    // and set automatically by the shopware-api-client. Like this it is possible to just call refresh here :)
    await refreshSessionContext()

    router.push({
      path: PAGE_EXPRESS_CONFIRM,
      query: { paypalOrderId: data.orderID },
    })
  }

  const handleError = () => {
    // Replicates Storefront-behaviour: Danger-notification with error message
    pushError(i18n.t("paypal.general.paymentError"))
  }

  return {
    initPaypal,
    handleCreateOrder,
    handleApprove,
    handleError,
  }
}
