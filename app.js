// Инициализация Web App SDK
try {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
} catch (e) {
    console.error("Telegram Web App SDK is not available.");
}

const BACKEND_URL = 'https://antiscamxxl-ux.github.io/tobaccoroom3/'; // ЗАМЕНИТЕ НА ВАШ URL

// Элементы
const welcomeScreen = document.getElementById('welcome-screen');
const shopScreen = document.getElementById('shop-screen');
const cartScreen = document.getElementById('cart-screen');
const checkoutScreen = document.getElementById('checkout-screen');

const continueButton = document.getElementById('continue-button');
const cartButtonHeader = document.getElementById('view-cart-button'); 
const cartCounter = document.getElementById('cart-counter');
const backFromCartButton = document.getElementById('back-from-cart');
const checkoutButton = document.getElementById('checkout-button');
const backToCartButton = document.getElementById('back-to-cart');
const placeOrderButton = document.getElementById('place-order-button');
const checkoutForm = document.getElementById('checkout-form');

const modal = document.getElementById('question-modal');
const openQuestionButton = document.getElementById('open-question-modal');
const modalCloseButton = document.getElementById('modal-close-button');
const modalSendButton = document.getElementById('modal-send-button');

const shopHeader = document.querySelector('#shop-screen .shop-header');
const contentArea = document.getElementById('content-area');

// Состояние
let currentScreenId = 'welcome-screen';
let currentProducts = {}; // Для быстрого поиска товаров по ID
let currentCategories = []; // Сохраняем категории
let cart = {}; // { productId: quantity }

// ----------------------------------------------------
// 1. УПРАВЛЕНИЕ ЭКРАНАМИ И АНИМАЦИЯМИ
// ----------------------------------------------------

function switchScreen(fromId, toId) {
    const fromScreen = document.getElementById(fromId);
    const toScreen = document.getElementById(toId);
    
    if (fromScreen && toScreen) {
        fromScreen.style.opacity = '0';
        fromScreen.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            fromScreen.classList.remove('active');
            
            toScreen.classList.add('active');
            toScreen.style.opacity = '1';
            toScreen.style.transform = 'translateY(0)';

            currentScreenId = toId;

            if (toId === 'shop-screen') {
                if (currentCategories.length === 0) {
                    loadShopCategories();
                } else {
                    // При переключении на shop-screen, всегда показываем категории по умолчанию
                    renderCategories(currentCategories);
                }
            }
            
            if (toId === 'cart-screen') {
                renderCart();
            }
            if (toId === 'checkout-screen') {
                updateCheckoutSummary();
            }
        }, 500);
    }
}

// Запуск анимации приветствия и появление кнопки "Продолжить"
window.onload = () => {
    // Ждем завершения CSS-анимаций (1.5с + небольшой запас)
    setTimeout(() => {
        continueButton.classList.remove('hidden');
    }, 2000); 
    // Привязываем основные кнопки в шапке сразу
    cartButtonHeader.addEventListener('click', () => switchScreen(currentScreenId, 'cart-screen'));
    openQuestionButton.addEventListener('click', openQuestionModal);
    updateCartDisplay(); // Инициализируем счетчик
};

continueButton.addEventListener('click', () => {
    switchScreen('welcome-screen', 'shop-screen');
});

// Навигация
backFromCartButton.addEventListener('click', () => switchScreen('cart-screen', 'shop-screen'));
backToCartButton.addEventListener('click', () => switchScreen('checkout-screen', 'cart-screen'));
checkoutButton.addEventListener('click', () => switchScreen('cart-screen', 'checkout-screen'));


// ----------------------------------------------------
// 2. ФУНКЦИОНАЛ ВИТРИНЫ (Загрузка данных и отображение)
// ----------------------------------------------------

// Функция для рендеринга контейнера категорий
function renderCategories(categories) {
    // 1. Восстанавливаем шапку магазина (название и кнопки)
    shopHeader.querySelector('.shop-title').textContent = 'TOBACCO ROOM 46';
    shopHeader.querySelector('.header-actions').innerHTML = `
        <button id="view-cart-button" class="cart-button-header">
            🛒 (<span id="cart-counter">${Object.values(cart).reduce((sum, qty) => sum + qty, 0)}</span>)
        </button>
        <button id="open-question-modal" class="question-button">
            Задать вопрос
        </button>
    `;
    // Перепривязываем слушателей событий
    document.getElementById('view-cart-button').addEventListener('click', () => switchScreen(currentScreenId, 'cart-screen'));
    document.getElementById('open-question-modal').addEventListener('click', openQuestionModal);
    updateCartDisplay();

    // 2. Отображаем категории
    contentArea.className = 'categories-grid';
    contentArea.innerHTML = categories.map(category => `
        <div class="category-card" data-category-id="${category.id}">
            <p class="category-title">${category.name}</p>
            <small style="color: gray;">${category.count} товаров</small>
        </div>
    `).join('');

    // 3. Привязываем обработчики
    contentArea.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const categoryId = parseInt(card.dataset.categoryId);
            const category = categories.find(c => c.id === categoryId);
            loadProducts(categoryId, category.name);
        });
    });
}


async function loadShopCategories() {
    contentArea.innerHTML = '<div style="text-align: center;">Загрузка витрины...</div>';
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/shop/categories`);
        if (!response.ok) throw new Error('Ошибка сети или сервера.');
        
        const result = await response.json();
        currentCategories = result.categories; // Сохраняем категории
        
        if (currentCategories.length === 0) {
             contentArea.innerHTML = '<p style="text-align: center;">Каталог пуст.</p>';
             return;
        }

        renderCategories(currentCategories);

    } catch (error) {
        contentArea.innerHTML = '<div style="color: red; text-align: center;">Ошибка загрузки каталога.</div>';
        console.error('Ошибка загрузки каталога:', error);
    }
}

async function loadProducts(categoryId, categoryName) {
    // 1. Изменяем шапку для экрана товаров
    shopHeader.querySelector('.shop-title').textContent = categoryName;
    shopHeader.querySelector('.header-actions').innerHTML = `
        <button id="back-to-categories-from-products" class="question-button" style="background-color: #6c757d;">
            ← Назад
        </button>
    `;
    // Кнопка "Назад" теперь просто вызывает loadShopCategories
    document.getElementById('back-to-categories-from-products').addEventListener('click', () => renderCategories(currentCategories));

    // 2. Загружаем и отображаем товары
    contentArea.className = 'products-list';
    contentArea.innerHTML = 'Загрузка товаров...';

    try {
        const response = await fetch(`${BACKEND_URL}/api/shop/products/${categoryId}`);
        if (!response.ok) throw new Error('Ошибка сети.');
        
        const result = await response.json();
        const products = result.products;
        
        // Сохраняем товары для корзины
        products.forEach(p => currentProducts[p.id] = p);

        if (products.length === 0) {
            contentArea.innerHTML = '<p style="text-align: center; color: var(--text-dark);">В этой категории пока нет товаров.</p>';
            return;
        }

        contentArea.innerHTML = products.map(product => `
            <div class="product-card">
                <h4 class="product-name">${product.name}</h4>
                <p class="product-description">${product.description}</p>
                <div class="product-price">
                    <span style="font-weight: 700; color: var(--primary-blue);">${product.price} ₽</span>
                </div>
                <button class="action-button add-to-cart-btn" data-product-id="${product.id}">
                    В корзину
                </button>
            </div>
        `).join('');

        // Привязываем обработчики для кнопок "В корзину"
        contentArea.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = parseInt(e.currentTarget.dataset.productId);
                addToCart(productId);
            });
        });

    } catch (error) {
        contentArea.innerHTML = '<p style="color: red; text-align: center;">Не удалось загрузить товары.</p>';
        console.error('Ошибка загрузки товаров:', error);
    }
}


// ----------------------------------------------------
// 3. ФУНКЦИОНАЛ КОРЗИНЫ
// ----------------------------------------------------

function addToCart(productId) {
    cart[productId] = (cart[productId] || 0) + 1;
    updateCartDisplay();
    try {
        Telegram.WebApp.showPopup({ message: `${currentProducts[productId].name} добавлен в корзину!` });
    } catch (e) {
        console.log('Добавлено в корзину:', currentProducts[productId].name);
    }
}

function removeFromCart(productId, removeAll = false) {
    if (!cart[productId]) return;

    if (removeAll || cart[productId] <= 1) {
        delete cart[productId];
    } else {
        cart[productId] -= 1;
    }
    updateCartDisplay();
    if (currentScreenId === 'cart-screen') {
        renderCart(); 
    }
}

function updateCartDisplay() {
    const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    cartCounter.textContent = totalItems;
}

function calculateCartTotal() {
    return Object.entries(cart).reduce((total, [id, qty]) => {
        const product = currentProducts[parseInt(id)];
        return total + (product ? product.price * qty : 0);
    }, 0);
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const totalElement = document.getElementById('cart-total-price');
    const summaryBox = document.getElementById('cart-summary');
    const emptyMessage = document.getElementById('empty-cart-message');

    const items = Object.entries(cart).map(([id, qty]) => ({
        product: currentProducts[parseInt(id)],
        quantity: qty
    })).filter(item => item.product);

    const total = calculateCartTotal();
    totalElement.textContent = `${total.toFixed(0)} ₽`;
    
    if (items.length === 0) {
        container.innerHTML = '';
        emptyMessage.style.display = 'block';
        summaryBox.classList.add('hidden');
        return;
    }

    emptyMessage.style.display = 'none';
    summaryBox.classList.remove('hidden');

    container.innerHTML = items.map(item => `
        <div class="cart-item" data-product-id="${item.product.id}">
            <div class="cart-item-info">
                ${item.product.name}
                <span style="display: block; font-size: 14px; color: #6c757d;">${item.product.price} ₽ x ${item.quantity}</span>
            </div>
            <div class="cart-item-actions">
                <button class="qty-btn remove-one-btn" data-id="${item.product.id}">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn add-one-btn" data-id="${item.product.id}">+</button>
                <button class="qty-btn remove-all-btn" data-id="${item.product.id}" style="background-color: #dc3545;">❌</button>
            </div>
        </div>
    `).join('');

    // Привязка обработчиков для кнопок в корзине
    container.querySelectorAll('.add-one-btn').forEach(btn => btn.addEventListener('click', (e) => addToCart(parseInt(e.currentTarget.dataset.id))));
    container.querySelectorAll('.remove-one-btn').forEach(btn => btn.addEventListener('click', (e) => removeFromCart(parseInt(e.currentTarget.dataset.id))));
    container.querySelectorAll('.remove-all-btn').forEach(btn => btn.addEventListener('click', (e) => removeFromCart(parseInt(e.currentTarget.dataset.id), true)));
}

// ----------------------------------------------------
// 4. ОФОРМЛЕНИЕ ЗАКАЗА
// ----------------------------------------------------

function updateCheckoutSummary() {
    const finalTotalElement = document.getElementById('final-total-price');
    const total = calculateCartTotal();
    finalTotalElement.textContent = `${total.toFixed(0)} ₽`;
}

checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    placeOrderButton.disabled = true;
    placeOrderButton.textContent = 'Отправка...';

    const orderData = {
        name: document.getElementById('user-name').value.trim(),
        phone: document.getElementById('user-phone').value.trim(),
        comment: document.getElementById('user-address').value.trim(),
        
        cartItems: Object.entries(cart).map(([id, qty]) => ({
            productId: parseInt(id),
            quantity: qty,
            price: currentProducts[parseInt(id)].price,
            name: currentProducts[parseInt(id)].name
        })),
        totalPrice: calculateCartTotal(),
        
        initData: Telegram.WebApp.initData,
        user: Telegram.WebApp.initDataUnsafe.user 
    };

    try {
        const response = await fetch(`${BACKEND_URL}/api/order/place`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();

        if (result.success) {
            cart = {}; // Очистка корзины
            updateCartDisplay();
            
            Telegram.WebApp.showAlert('✅ Ваш заказ успешно оформлен! Администратор скоро свяжется с вами.');
            switchScreen('checkout-screen', 'shop-screen');
        } else {
            throw new Error(result.error || 'Ошибка при оформлении заказа.');
        }

    } catch (error) {
        console.error('Ошибка заказа:', error);
        Telegram.WebApp.showAlert(`❌ Не удалось оформить заказ: ${error.message}`);
    } finally {
        placeOrderButton.disabled = false;
        placeOrderButton.textContent = 'Подтвердить и отправить заказ';
    }
});


// ----------------------------------------------------
// 5. МОДАЛЬНОЕ ОКНО "ЗАДАТЬ ВОПРОС"
// ----------------------------------------------------

function openQuestionModal() {
    modal.classList.add('visible');
}

modalCloseButton.addEventListener('click', () => {
    modal.classList.remove('visible');
});

// ----------------------------------------------------
// 5. МОДАЛЬНОЕ ОКНО "ЗАДАТЬ ВОПРОС" (ОБНОВЛЕННЫЙ КОД)
// ----------------------------------------------------

// ... (функция openQuestionModal без изменений) ...
// ... (обработчик modalCloseButton без изменений) ...

modalSendButton.addEventListener('click', async () => {
    const questionText = document.getElementById('modal-question-input').value.trim();
    
    if (questionText.length < 5) {
        Telegram.WebApp.showAlert('Пожалуйста, введите ваш вопрос (минимум 5 символов).');
        return;
    }
    
    modalSendButton.disabled = true;
    modalSendButton.textContent = 'Отправка...';

    const issueData = {
        questionText: questionText,
        initData: Telegram.WebApp.initData
    };

    try {
        const response = await fetch(`${BACKEND_URL}/api/issue/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(issueData)
        });
        
        const result = await response.json();

        if (result.success) {
            Telegram.WebApp.showAlert('✅ Ваш вопрос отправлен администратору!');
            modal.classList.remove('visible');
            document.getElementById('modal-question-input').value = '';
        } else {
            throw new Error(result.error || 'Ошибка отправки.');
        }

    } catch (error) {
        console.error('Ошибка отправки вопроса:', error);
        Telegram.WebApp.showAlert(`❌ Не удалось отправить вопрос: ${error.message || 'Ошибка сети'}`);
    } finally {
        modalSendButton.disabled = false;
        modalSendButton.textContent = 'Отправить';
    }
});