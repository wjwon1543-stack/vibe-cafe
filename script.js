// 1. Supabase 대시보드에서 확인한 Project URL과 API Key를 입력하는 곳입니다.
//    (필요한 경우 본인의 Supabase 프로젝트 값으로 직접 변경할 수 있습니다.)
const SUPABASE_URL = 'https://vxhrlseeyjpudryxidex.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4F383mdMF_1RsvbzwEsZGg_2QCNGHTy';

// 2. CDN으로 불러온 Supabase 라이브러리를 사용해 supabaseClient 클라이언트 객체를 생성합니다.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// HTML에서 주문서와 필요한 입력 요소들을 가져옵니다.
const orderForm = document.getElementById('order-form');
const customerNameInput = document.getElementById('customer-name');
const drinkSelect = document.getElementById('drink');
const quantityInput = document.getElementById('quantity');
const estimatedPrice = document.getElementById('estimated-price');
const orderConfirmation = document.getElementById('order-confirmation');
const orderTab = document.getElementById('order-tab');
const historyTab = document.getElementById('history-tab');
const orderPanel = document.getElementById('order-panel');
const historyPanel = document.getElementById('history-panel');
const ordersList = document.getElementById('orders-list');
const ordersCount = document.getElementById('orders-count');
const ordersTotal = document.getElementById('orders-total');
const clearOrdersButton = document.getElementById('clear-orders');

// 접수된 주문을 브라우저가 열려 있는 동안 배열에 보관합니다.
const orders = [];
let nextOrderNumber = 1;

// 선택한 탭만 보이도록 기존 hidden 클래스를 사용합니다.
function selectTab(selectedTab) {
  const showHistory = selectedTab === historyTab;

  orderTab.classList.toggle('active', !showHistory);
  orderTab.setAttribute('aria-selected', String(!showHistory));
  historyTab.classList.toggle('active', showHistory);
  historyTab.setAttribute('aria-selected', String(showHistory));
  orderPanel.classList.toggle('hidden', showHistory);
  historyPanel.classList.toggle('hidden', !showHistory);
}

orderTab.addEventListener('click', () => selectTab(orderTab));
historyTab.addEventListener('click', () => selectTab(historyTab));

// 주문 배열을 카드 목록, 주문 건수, 총액으로 화면에 다시 그립니다.
function renderOrders() {
  ordersList.replaceChildren();
  ordersCount.textContent = String(orders.length);

  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0);
  ordersTotal.textContent = `총 주문 금액: ${totalAmount.toLocaleString('ko-KR')}원 (${orders.length}건)`;

  if (orders.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'orders-empty';
    emptyMessage.textContent = '아직 주문 내역이 없어요 ☕';
    ordersList.append(emptyMessage);
    return;
  }

  // 배열은 최신 주문이 앞에 있으므로 화면에도 최신 주문부터 표시됩니다.
  orders.forEach((order) => {
    const card = document.createElement('article');
    card.className = 'order-card';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'order-card-header';

    const title = document.createElement('p');
    title.className = 'order-card-title';
    title.textContent = `#${order.orderNumber} ${order.customerName}님 · ${order.amount.toLocaleString('ko-KR')}원`;

    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-order-button';
    cancelButton.type = 'button';
    cancelButton.dataset.orderNumber = String(order.orderNumber);
    cancelButton.textContent = '취소';

    cardHeader.append(title, cancelButton);

    const detail = document.createElement('p');
    detail.className = 'order-card-detail';
    const extrasText = order.extras.length > 0 ? ` (${order.extras.join(', ')})` : '';
    detail.textContent = `${order.drink} ${order.size}사이즈${extrasText} ${order.quantity}잔`;

    const meta = document.createElement('p');
    meta.className = 'order-card-meta';
    meta.textContent = order.request
      ? `${order.request} · ${order.orderedAt}`
      : order.orderedAt;

    card.append(cardHeader, detail, meta);
    ordersList.append(card);
  });
}

// 목록 안의 취소 버튼을 눌렀을 때 주문을 확인한 뒤 배열에서 제거합니다.
ordersList.addEventListener('click', (event) => {
  const cancelButton = event.target.closest('.cancel-order-button');
  if (!cancelButton) {
    return;
  }

  const orderNumber = Number(cancelButton.dataset.orderNumber);
  const order = orders.find((item) => item.orderNumber === orderNumber);
  if (!order || !window.confirm(`#${orderNumber} 주문을 취소할까요?`)) {
    return;
  }

  const orderIndex = orders.findIndex((item) => item.orderNumber === orderNumber);
  orders.splice(orderIndex, 1);
  renderOrders();
});

// 전체 삭제 버튼은 확인을 받은 뒤에만 모든 주문을 지웁니다.
clearOrdersButton.addEventListener('click', () => {
  if (orders.length === 0 || !window.confirm('주문 내역을 모두 지울까요?')) {
    return;
  }

  orders.length = 0;
  renderOrders();
});

// 음료, 사이즈, 선택 옵션의 가격을 더하고 수량을 곱해 예상 금액을 표시합니다.
function calculateTotal() {
  const selectedDrink = drinkSelect.selectedOptions[0];

  // 음료를 고르지 않았다면 사이즈나 옵션 가격과 관계없이 0원으로 표시합니다.
  if (!drinkSelect.value) {
    estimatedPrice.textContent = '예상 금액: 0원';
    return 0;
  }

  // data-price는 문자열이므로 숫자로 바꾸어 더합니다.
  let oneDrinkPrice = Number(selectedDrink.dataset.price);
  const selectedSize = orderForm.querySelector('input[name="size"]:checked');

  if (selectedSize) {
    oneDrinkPrice += Number(selectedSize.dataset.price);
  }

  // 체크된 옵션만 한 잔 가격에 더합니다.
  const checkedExtras = orderForm.querySelectorAll('input[name="extras"]:checked');
  checkedExtras.forEach((extra) => {
    oneDrinkPrice += Number(extra.dataset.price);
  });

  // 수량이 비어 있거나 숫자가 아니면 1로 계산하고, 입력 범위 안으로 맞춥니다.
  const enteredQuantity = Number.parseInt(quantityInput.value, 10);
  const quantity = Math.min(10, Math.max(1, enteredQuantity || 1));
  const total = oneDrinkPrice * quantity;

  // toLocaleString()으로 천 단위마다 콤마를 넣어 금액을 읽기 쉽게 표시합니다.
  estimatedPrice.textContent = `예상 금액: ${total.toLocaleString('ko-KR')}원`;
  return total;
}

// 입력값이나 선택값이 바뀔 때마다 예상 금액을 새로 계산합니다.
orderForm.addEventListener('input', calculateTotal);
orderForm.addEventListener('change', calculateTotal);

// 다시 작성 버튼을 누르면 기본값 복원이 끝난 다음 금액과 확인 메시지를 초기화합니다.
orderForm.addEventListener('reset', () => {
  window.setTimeout(() => {
    calculateTotal();
    orderConfirmation.textContent = '';
    orderConfirmation.hidden = true;
  }, 0);
});

// [주문 저장 함수] 사용자가 입력한 주문 정보를 Supabase의 "바이브 카페_03" 테이블에 저장합니다.
async function saveOrderToSupabase(orderData) {
  // Supabase URL과 키가 제대로 입력되었는지 기본 검사를 진행합니다.
  const isConfigured = SUPABASE_URL.startsWith('https://')
    && SUPABASE_KEY
    && !SUPABASE_URL.includes('YOUR_')
    && !SUPABASE_KEY.includes('YOUR_');

  if (!isConfigured) {
    throw new Error('script.js 상단의 SUPABASE_URL과 SUPABASE_KEY에 실제 값을 입력해주세요.');
  }

  // Supabase 클라이언트를 사용해 "바이브 카페_03" 테이블에 새로운 행(row)을 삽입(insert)합니다.
  const { error } = await supabaseClient
    .from('바이브 카페_03')
    .insert(orderData);

  // 저장 중 에러가 발생하면 에러를 던져 catch 블록에서 처리하도록 합니다.
  if (error) {
    throw error;
  }
}

// [주문서 제출 이벤트] "주문하기" 버튼을 클릭했을 때 실행되는 동작입니다.
orderForm.addEventListener('submit', async (event) => {
  // 폼 제출 시 브라우저가 새로고침되는 기본 동작을 막습니다.
  event.preventDefault();

  // 1. 필수 입력 항목(이름, 음료) 확인
  const customerName = customerNameInput.value.trim();
  if (!customerName) {
    window.alert('이름을 입력해주세요');
    customerNameInput.focus();
    return;
  }

  if (!drinkSelect.value) {
    window.alert('음료를 선택해주세요');
    drinkSelect.focus();
    return;
  }

  // 2. 화면에서 사용자가 선택/입력한 값 추출하기
  const selectedDrink = drinkSelect.selectedOptions[0];
  const drinkName = selectedDrink.textContent.replace(/\s+[\d,]+원$/, '');
  const selectedSize = orderForm.querySelector('input[name="size"]:checked');
  const sizeName = selectedSize ? selectedSize.value : 'M';
  const quantity = Math.min(10, Math.max(1, Number.parseInt(quantityInput.value, 10) || 1));
  const checkedExtras = orderForm.querySelectorAll('input[name="extras"]:checked');
  const extraNames = Array.from(checkedExtras, (extra) => {
    const label = orderForm.querySelector(`label[for="${extra.id}"]`);
    return label.textContent.replace(/\s*\+\s*[\d,]+원$/, '');
  });
  const extrasText = extraNames.length > 0 ? ` (${extraNames.join(', ')})` : '';
  const total = calculateTotal();
  const request = document.getElementById('request').value.trim();
  const drinkPrice = Number(selectedDrink.dataset.price);

  // 3. Supabase "바이브 카페_03" 테이블의 컬럼 규격에 맞춰 저장할 데이터 객체 구성
  // (customer_name, phone, drink, drink_price, size, options(배열), quantity, request, total_price)
  const orderData = {
    customer_name: customerName,
    phone: document.getElementById('phone').value.trim(),
    drink: drinkName,
    drink_price: drinkPrice,
    size: sizeName,
    options: extraNames,
    quantity,
    request,
    total_price: total
  };

  // 4. 저장이 진행되는 동안 중복 클릭을 방지하기 위해 주문하기 버튼을 비활성화합니다.
  const submitButton = orderForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  orderConfirmation.textContent = '';
  orderConfirmation.hidden = true;

  try {
    // 5. Supabase 테이블에 주문 데이터를 비동기로 저장합니다.
    await saveOrderToSupabase(orderData);

    // 6. 저장이 성공했을 때: 화면의 주문 내역 목록에 추가하고 확인 메시지를 표시합니다.
    orders.unshift({
      orderNumber: nextOrderNumber,
      customerName,
      drink: drinkName,
      size: sizeName,
      extras: extraNames,
      quantity,
      request,
      amount: total,
      orderedAt: new Date().toLocaleString('ko-KR')
    });
    nextOrderNumber += 1;
    renderOrders();

    // 기존 주문 완료 확인 메시지 표시
    orderConfirmation.textContent = `${customerName}님, ${drinkName} ${sizeName}사이즈${extrasText} ${quantity}잔, 총 ${total.toLocaleString('ko-KR')}원 주문이 접수되었습니다!`;
    orderConfirmation.hidden = false;
  } catch (error) {
    // 7. 저장이 실패했을 때: 콘솔에 에러 출력 및 사용자에게 알림창 표시
    console.error('Supabase 주문 저장 에러:', error);
    window.alert('주문 저장에 실패했어요');
  } finally {
    // 8. 저장이 성공하든 실패하든 주문 버튼을 다시 활성화합니다.
    submitButton.disabled = false;
  }
});

// 페이지를 처음 열었을 때도 현재 선택값 기준으로 예상 금액을 맞춥니다.
calculateTotal();
renderOrders();