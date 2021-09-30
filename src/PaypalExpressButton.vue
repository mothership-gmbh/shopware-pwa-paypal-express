<template>
  <div ref="buttonTemplateRef" class="paypal-button" />
</template>

<script lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue-demi"
import { usePaypalExpress } from "./usePaypalExpress"
import { useCms } from "@shopware-pwa/composables"

declare global {
  interface Window {
    paypal: any
  }
}

export default {
  name: "PaypalExpressButton",
  props: {
    paypalClientId: {
      type: String
    },
    isProductPage: {
      type: Boolean,
      default: false,
    },
    styleOptions: {
      type: Object,
      default: () => ({
        size: "medium",
        shape: "rect",
        color: "gold",
        layout: "horizontal",
        label: "checkout",
        tagline: false,
      }),
    },
  },
  setup(props) {
    const { initPaypal, handleCreateOrder, handleApprove, handleError } =
      usePaypalExpress()
    const { page } = useCms()
    //@ts-ignore
    const product = computed(() => page.value?.product)
    const buttonTemplateRef = ref()
    const paypalButtonInstance = ref()
    const styleOptions = computed(() => {
      return {
        ...props.styleOptions,
        height:
          props.styleOptions?.height ?? buttonTemplateRef.value.offsetHeight
            ? buttonTemplateRef.value.offsetHeight
            : 40,
      }
    })

    onMounted(async () => {
      const renderButton = (paypalObject) => {
        paypalButtonInstance.value = paypalObject.Buttons({
          style: styleOptions.value,
          createOrder: () =>
            handleCreateOrder(props.isProductPage, product.value?.id),
          onApprove: handleApprove,
          onError: handleError,
        })
        paypalButtonInstance.value.render(buttonTemplateRef.value)
      }
      const onLoadCallback = () => {
        const paypal = window.paypal
        renderButton(paypal)
      }

      initPaypal(props.paypalClientId, onLoadCallback)
    })

    onBeforeUnmount(async () => {
      paypalButtonInstance.value.close()
    })

    return { buttonTemplateRef }
  },
}
</script>

<style scoped>
.paypal-button {
  position: relative;
  z-index: 1;
}
</style>
