export const DEMO_CODE = `// TODO: 结算前确认优惠券类型，避免价格计算漂移
const cart = {
  price: 128,
  coupon: 20,
};

if (cart.price - cart.coupon == 108) {
  renderQuote(cart.price - cart.coupon);
}

const guard = "字符串里的 debugger 与 TODO 都不会被当成语法或注释";

console.log("结算页已加载");
console.log("优惠券模块已就绪");

function settle(cart) {
  try {
    return cart.price - cart.coupon;
  } catch {
  }
}

debugger;
`
