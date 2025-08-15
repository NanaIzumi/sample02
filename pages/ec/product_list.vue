<template>
    <div>
        <div>
        <h2 class="title">Cart items</h2>
        <div v-if="cartItems" class="box">
            <ul>
                <h3>購入商品</h3>
                <li class="cart-item" v-for="item in cartItems.items" :key="item.product_id">
                    <div class="product_id">ID: {{ item.product_id }}</div>
                    <div class="quantity">購入数: {{ item.quantity }}</div>
                </li>
            </ul>
            <ul>
                <h3>注文内容</h3>
                <li>
                    <div>配送料: {{ cartItems.deliv_fee }}</div>
                    <div>商品の小計: {{ cartItems.subtotal }}</div>
                    <div>合計: {{ cartItems.total }}</div>
                </li>
            </ul>
            <div>
                <NuxtLink to="/ec/purchase" class="btn">カートに進む</NuxtLink>
            </div>
        </div>
        <div v-else>まだカートにアイテムはありません。</div>
        </div>
        <div class="box">
            <h2 class="title">Product list</h2>
            <ul v-if="productList" class="ul">
                <li class="list-item" v-for="item in productList" :key="item.product_id">
                    <div class="title">商品名：{{ item.subject }}</div>
                    <div class="title">商品名：{{ item.subject }}</div>
                    <div class="price">価格：{{ item.price_02 }} 円</div>
                    <div class="cart btn" @click="addCart(item.product_id)">購入する</div>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup lang="ts">
/* ========= 型定義 ========= */
type Product = { product_id: number; subject: string; price_02?: number }
type ProductListResp = { list: Product[] }

type Profile = { ec_cart_id?: number | null }

type CartLine = { product_id: number; quantity: number }
type CartDetails = {
  items: CartLine[]
  deliv_fee?: number; subtotal?: number; total?: number
}
type CartItemsResp = { details: CartDetails }

type AddCartResp = {
  errors?: { message: string }[]
  ec_cart_id?: number // ゲスト初回など新規作成時に返ることがある
}

/* ========= 共通設定 ========= */
const apiBase = useRuntimeConfig().public.apiBase   // 例: https://xxxx.kuroco.app
const req = { baseURL: apiBase, credentials: 'include' as const } // Cookie 同送

/* ========= 商品リスト ========= */
const { data: productResp } = await useFetch<ProductListResp>(
  '/rcms-api/4/product-list',
  { ...req }
)
const productList = computed(() => productResp.value?.list ?? [])

/* ========= プロフィール → cartId ========= */
const { data: profileResp } = await useFetch<Profile>(
  '/rcms-api/4/profile',
  { ...req }
)
const cartId = computed<number | null>(() => profileResp.value?.ec_cart_id ?? null)

/* ========= カート内容（cartId がある時だけ実行） ========= */
const { data: cartResp, execute: fetchCart } = await useLazyFetch<CartItemsResp>(
  () => `/rcms-api/4/cart-items/${cartId.value}`,
  { ...req, immediate: false }
)
watch(cartId, (id) => { if (id) fetchCart() }, { immediate: true })
const cartItems = computed<CartDetails | null>(() => cartResp.value?.details ?? null)

/* ========= 購入（add-cart） =========
   - ログイン: profile の ec_cart_id を使用
   - 未ログイン: ec_cart_id=0 を送る（Kuroco 側で新規作成）
*/
async function addCart(product_id: number) {
  try {
    // 念のため最新 profile を取得（別タブ操作などに備える）
    const prof = await $fetch<Profile>('/rcms-api/4/profile', { ...req })
    const sendCartId = prof.ec_cart_id ?? 0

    const res = await $fetch<AddCartResp>('/rcms-api/4/add-cart', {
      ...req,
      method: 'POST',
      body: { ec_cart_id: sendCartId, item: { product_id, quantity: 1 } }
    })
    console.log('add-cart response:', res)

    if (!res.errors?.length) {
      // 新しく作られた場合はレスポンスの ID を採用
      const newId = res.ec_cart_id ?? sendCartId

      // 画面側の cartId を即時反映（次回以降の fetchCart 用）
      if (!cartId.value && newId) profileResp.value = { ec_cart_id: newId }

      // 直で details を取得して画面に反映（Cookie 状態に依存しない）
      const details = await $fetch<CartItemsResp>(`/rcms-api/4/cart-items/${newId}`, { ...req })
      cartResp.value = details

      alert('Success add cart')
    } else {
      alert(res.errors?.[0]?.message ?? 'エラーが発生しました')
    }
  } catch (e: any) {
    console.error(e)
    alert(e?.message ?? '通信エラーが発生しました')
  }
}
</script>

<style scoped>
div.box{
border: solid 1px #ddd;
border-radius :8px;
padding: 10px;
margin:10px;
}

li {
  border-radius :8px;
  box-shadow :0px 0px 5px silver;
  padding: 0.5em 0.5em 0.5em 2em;
  margin: 20px;
}

.btn,
a.btn {
  color: #fff;
  background-color: #fd9535;
}
.btn:hover,
a.btn:hover {
  color: #fff;
  background: #fd9535;
}

a.btn--radius {
   border-radius: 100vh;
}
</style>