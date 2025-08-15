<template>
    <div>
        <div class="box">
            <h2 class="title">注文内容</h2>
            <ul v-if="cartItems">
                <div>配送料: {{ cartItems.deliv_fee }}</div>
                <div>商品の小計: {{ cartItems.subtotal }}</div>
                <div>合計: {{ cartItems.total }}</div>
                
                <li class="cart-item" v-for="item in cartItems.items" :key="item.product_id">
                    <div class="product_id">ID: {{ item.product_id }}</div>
                    <div class="quantity">購入数: {{ item.quantity }}</div>
                </li>
            </ul>
        </div>
        <div class="box">
            <h2 class="title">購入者情報</h2>
            <label for="cheese">お名前</label>
            <input name="name1" v-model="orderer.name1" /> <input name="name2" v-model="orderer.name2" /><br/>
            <label for="cheese">郵便番号</label>
            <input name="zip_code" v-model="orderer.zip_code" maxlength="7" minlength="7" /><br/>
            <label for="cheese">住所</label>
            <select name="tdfk_cd" v-model="orderer.tdfk_cd">
            <option value="">-- No selected --</option>
            <option value="01">北海道</option>
            <!-- 省略 -->
            <option value="13">東京都</option>
            <!-- 省略 -->
            <option value="47">沖縄県</option>
            </select><br/>
            <input name="address1" v-model="orderer.address1" /><br/>
            <input name="address2" v-model="orderer.address2" /><br/>
            <input name="address3" v-model="orderer.address3" /><br/>
            <label for="cheese">電話番号</label>
            <input name="tel" v-model="orderer.tel" /><br/>
            <label for="cheese">メールアドレス</label>
            <input name="email" v-model="orderer.email" /><br/>
        </div>
        <div class="box">
            <h2 class="title">支払い方法</h2>
            <div class="payment" >
                <span>お支払い方法を選択する >> </span>
                <select v-model="paymentId">
                    <option value="0">-- 選択する --</option>
                    <option v-for="(paymment_info, payment_id) in paymentList" :key="payment_id"
                        :value="payment_id"
                    >{{ paymment_info.payment_type }}
                    </option>
                </select>
            </div>
            <!-- Add credit card information entry forms, etc. as needed. -->
            <!-- 必要に応じてクレジットカード情報入力フォームなどを追加 -->
            <div @click="normalBuy()" class="cart btn">
                注文を確定する
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
/* ========= 型 ========= */
type Profile = {
  ec_cart_id?: number | null
  name1?: string; name2?: string
  zip_code?: string; tdfk_cd?: string
  address1?: string; address2?: string; address3?: string
  tel?: string; email?: string
}

type CartLine = { product_id: number; quantity: number }
type CartDetails = {
  items: CartLine[]
  deliv_fee?: number; subtotal?: number; total?: number
}
type CartResp = {
  details: CartDetails
  // 支払い方法は環境差があるため緩めに
  payment_list?: Record<string, { payment_type: string }> | Array<any>
}

type PurchaseResp = { errors?: { message: string }[] }

/* ========= 共通設定 ========= */
const apiBase = useRuntimeConfig().public.apiBase // 例: https://xxxx.kuroco.app
const req = { baseURL: apiBase, credentials: 'include' as const }

/* ========= localStorage に保存された cart_id（ゲスト用の引き継ぎ） ========= */
const storedId = ref<number | null>(null)
if (process.client) {
  const v = localStorage.getItem('ec_cart_id')
  storedId.value = v ? Number(v) : null
}

/* ========= プロフィール ========= */
const { data: profile } = await useFetch<Profile>('/rcms-api/4/profile', { ...req })

/* ========= cartId（profile優先／なければlocalStorage） ========= */
const cartId = computed<number | null>(() => profile.value?.ec_cart_id ?? storedId.value)

/* ========= カート明細（cartId がある時だけ実行） ========= */
const { data: cartResp, execute: fetchCart } = await useLazyFetch<CartResp>(
  () => `/rcms-api/4/cart-items/${cartId.value}`,
  { ...req, immediate: false }
)
watch(cartId, (id) => { if (id) fetchCart() }, { immediate: true })

const cartItems = computed<CartDetails | null>(() => cartResp.value?.details ?? null)

/* payment_list はオブジェクト/配列どちらでも対応して正規化 */
const paymentList = computed<Record<string, { payment_type: string }>>(() => {
  const raw = cartResp.value?.payment_list as any
  if (!raw) return {}
  if (Array.isArray(raw)) {
    const out: Record<string, { payment_type: string }> = {}
    for (const it of raw) {
      const id = String(it.payment_id ?? it.id ?? '')
      if (id) out[id] = { payment_type: it.payment_type ?? String(it.name ?? '') }
    }
    return out
  }
  return raw as Record<string, { payment_type: string }>
})

/* ========= フォーム初期値 ========= */
const orderer = reactive({
  name1: '', name2: '',
  zip_code: '', tdfk_cd: '',
  address1: '', address2: '', address3: '',
  tel: '', email: ''
})

/* プロフィール値で上書き */
watch(profile, (p) => {
  if (!p) return
  orderer.name1 = p.name1 ?? ''
  orderer.name2 = p.name2 ?? ''
  orderer.zip_code = p.zip_code ?? ''
  orderer.tdfk_cd = p.tdfk_cd ?? ''
  orderer.address1 = p.address1 ?? ''
  orderer.address2 = p.address2 ?? ''
  orderer.address3 = p.address3 ?? ''
  orderer.tel = p.tel ?? ''
  orderer.email = p.email ?? ''
}, { immediate: true })

/* ========= 支払い選択（テンプレに合わせて文字列で保持） ========= */
const paymentId = ref<string>('0')

/* ========= 購入 ========= */
async function normalBuy() {
  if (!cartId.value) {
    alert('カートが空です'); return
  }
  if (!paymentId.value || paymentId.value === '0') {
    alert('お支払い方法を選択してください'); return
  }

  const payload = {
    ec_cart_id: cartId.value,
    ec_payment_id: Number(paymentId.value),
    orderer: { ...toRaw(orderer) }
  }

  try {
    const res = await $fetch<PurchaseResp>('/rcms-api/4/purchase', {
      ...req,
      method: 'POST',
      body: payload
    })

    if (!res.errors?.length) {
      alert('購入が完了しました')
      // カートを空で上書きして画面に即反映
      cartResp.value = { details: { items: [], deliv_fee: 0, subtotal: 0, total: 0 } }
      // ゲスト用の保存をクリア
      if (process.client) localStorage.removeItem('ec_cart_id')
      // 例: サンクスページへ
      // await navigateTo('/ec/thanks')
    } else {
      alert(res.errors?.[0]?.message ?? 'エラーが発生しました')
    }
  } catch (e: any) {
    console.error(e)
    alert(e?.response?.statusText ?? e?.message ?? '通信エラーが発生しました')
  }
}
</script>