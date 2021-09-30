<template>
  <SfLoader :loading="loading">
    <div class="checkout" :key="$route.fullPath">
      <div class="checkout__main">
        <div class="top-wrapper">
          <div class="payment-method">
            <h3>{{ $t("Payment method") }}</h3>
            <div>{{ paymentMethodName }}</div>
          </div>
          <SwAddress
            v-if="activeShippingAddress"
            :address="activeShippingAddress"
            :address-title="$t('Shipping address')"
            class="content"
          />
        </div>
        <ShippingSection />
      </div>
      <div class="checkout__aside">
        <SidebarOrderReview
          key="order-review"
          class="checkout__aside-order"
          @create-order="handleConfirm"
        />
      </div>
    </div>
    <template #loader>
      <div class="sf-loader">
        <transition name="sf-fade" mode="out-in">
          <div class="sf-loader__overlay">
            <SfHeading
              :level="3"
              :title="$t('Your order is being created.')"
              :description="$t('Please wait...')"
            />
            <svg
              class="sf-loader__spinner"
              role="img"
              width="38"
              height="38"
              viewBox="0 0 38 38"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g fill="none" fill-rule="evenodd">
                <g transform="translate(1 1)" stroke-width="2">
                  <circle stroke-opacity=".5" cx="18" cy="18" r="18" />
                  <path d="M36 18c0-9.94-8.06-18-18-18">
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 18 18"
                      to="360 18 18"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </path>
                </g>
              </g>
            </svg>
          </div>
        </transition>
      </div>
    </template>
  </SfLoader>
</template>

<script lang="ts">
import { SfLoader, SfHeading } from "@storefront-ui/vue"
import SwButton from "@/components/atoms/SwButton.vue"
import ShippingSection from "@/components/checkout/ShippingSection.vue"
import SidebarOrderReview from "@/components/checkout/sidebar/SidebarOrderReview.vue"
import SwAddress from "@/components/SwAddress.vue"
import {
  useNotifications,
  getApplicationContext,
  SwRouting as SwRoutingOriginal,
  useSessionContext,
} from "@shopware-pwa/composables"
import {
  createOrder,
  handlePaymentEndpoint,
} from "@shopware-pwa/shopware-6-client"
import {
  PAGE_ORDER_SUCCESS,
  PAGE_ORDER_PAYMENT_FAILURE,
  PAGE_CART,
} from "@/helpers/pages"
import { computed, ref } from "vue-demi"

interface SwRouting extends SwRoutingOriginal {
  getAbsoluteUrl?: (path: string) => string
}

export default {
  name: "PaypalExpressConfirmPage",
  layout: "minimal",
  components: {
    SwButton,
    ShippingSection,
    SidebarOrderReview,
    SfLoader,
    SfHeading,
    SwAddress,
  },
  setup() {
    const {
      apiInstance,
      routing: routingOriginal,
      route,
      router,
      i18n,
    } = getApplicationContext({
      contextName: "paypalExpressConfirm",
    })
    const routing: SwRouting = routingOriginal // Nur um das Typing korrigieren zu können
    const { pushError } = useNotifications()

    const { activeShippingAddress, paymentMethod } = useSessionContext()

    const paymentMethodName = computed(() => paymentMethod.value?.name)

    const loading = ref(false)

    async function handleConfirm() {
      try {
        loading.value = true
        const order = await createOrder(apiInstance)
        const orderId = order.id

        const finishUrl = routing.getAbsoluteUrl(
          `${PAGE_ORDER_SUCCESS}?orderId=${orderId}`
        )
        const errorUrl = routing.getAbsoluteUrl(
          `${PAGE_ORDER_PAYMENT_FAILURE}?orderId=${orderId}`
        )
        const paypalOrderId = route.query.paypalOrderId
        if (!paypalOrderId) {
          throw new Error("PaypalOrderId missing from Url")
        }

        const paymentResp = await apiInstance.invoke.post(
          handlePaymentEndpoint(),
          {
            orderId,
            isPayPalExpressCheckout: 1,
            paypalOrderId,
            finishUrl,
            errorUrl,
          }
        )

        const redirectUrl = paymentResp.data.redirectUrl
        if (!redirectUrl) {
          throw new Error("No redirect url provided in handle-payment response")
        }
        window.location.href = redirectUrl
      } catch (e) {
        window.console.error(e)
        router.push(PAGE_CART)
        pushError(i18n.t("paypal.general.paymentError"))
      }
    }

    return {
      paymentMethodName,
      activeShippingAddress,
      loading,
      handleConfirm,
    }
  },
}
</script>

<style lang="scss" scoped>
@import "@/assets/scss/variables";

.checkout {
  @include for-desktop {
    max-width: 1272px;
    margin: 0 auto;
    padding: 0 var(--spacer-base);
    display: flex;
  }

  &__main {
    padding: 0 var(--spacer-sm);
    @include for-desktop {
      flex: 1;
      padding: var(--spacer-lg) 0 0 0;
    }
  }

  .top-wrapper {
    display: grid;
    grid-template-columns: 1fr;
    grid-gap: var(--spacer-base);

    @include for-desktop {
      grid-template-columns: 1fr 1fr;
    }
  }

  .payment-method {
    color: var(--c-text-muted);

    h3 {
      margin-bottom: var(--spacer-xs);
      color: var(--c-black);
    }
  }

  &__aside {
    margin: var(--spacer-xl) 0 0 0;
    @include for-desktop {
      flex: 0 0 26.8125rem;
      margin: 0 0 0 var(--spacer-xl);
    }
  }

  ::v-deep {
    .sw-address__content {
      font-size: var(--font-size--base);
    }

    .sw-address__title {
      font-size: var(--h3-font-size);
      margin-bottom: var(--spacer-xs);
    }
  }
}

.sf-loader__overlay {
  position: relative;
  flex-direction: column;

  .sf-heading {
    margin-bottom: var(--spacer-xl);
  }
}
</style>
