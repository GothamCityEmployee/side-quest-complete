// main.js — SQC Storefront Logic (Supabase-backed)

// ─── State ────────────────────────────────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('sqc-cart')) || [];

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderCartItems();
  updateCartCount();
  initEventListeners();
  initScrollSpy();
  initHeaderScroll();

  // Wait for Supabase client to be ready, then load products
  if (window.sqc) {
    loadProducts();
  } else {
    window.addEventListener('sqc:ready', loadProducts, { once: true });
  }
});

// ─── Load Products from Supabase ──────────────────────────────────────────────
async function loadProducts(categorySlug) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  grid.innerHTML = `<div class="loading-state"><span>Loading inventory...</span></div>`;

  let list;
  if (!categorySlug || categorySlug === 'all') {
    list = await window.SQCProducts.getAll();
  } else {
    list = await window.SQCProducts.getByCategory(categorySlug);
  }

  if (!list || list.length === 0) {
    grid.innerHTML = `<div class="empty-state"><p>No products found.</p></div>`;
    return;
  }

  renderProducts(list);
}

// ─── Product Rendering ────────────────────────────────────────────────────────
function renderProducts(list) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.innerHTML = list.map(createProductCard).join('');
}

function createProductCard(product) {
  const conditionClass = product.condition ? `condition-${product.condition.toLowerCase()}` : '';
  return `
    <div class="product-card" data-id="${product.id}" role="button" tabindex="0" aria-label="View ${product.name}">
      <div class="product-image" style="background: ${product.bg}">
        <img src="${product.image}" alt="${product.name}" onerror="this.style.display='none'">
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
      </div>
      <div class="product-info">
        <div class="product-meta-row">
          <span class="product-category">${product.category}</span>
          ${product.condition ? `<span class="condition-badge ${conditionClass}">${product.condition}</span>` : ''}
        </div>
        ${product.console ? `<span class="console-tag">${product.console}</span>` : ''}
        <h3 class="product-name">${product.name}</h3>
        <div class="product-footer">
          <span class="product-price">$${product.price.toFixed(2)}</span>
          <button class="btn-add-cart" data-id="${product.id}" aria-label="Add ${product.name} to cart">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Cart Core ────────────────────────────────────────────────────────────────
async function addToCart(productId) {
  const product = await window.SQCProducts.getById(productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    // Vintage/collectible items are one-of-a-kind — limit to 1 per item
    flashAddedEffect(productId);
    openCartDrawer();
    return;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  saveCart();
  updateCartCount();
  renderCartItems();
  openCartDrawer();
  flashAddedEffect(productId);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartCount();
  renderCartItems();
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty = Math.max(0, item.qty + delta);
  if (item.qty === 0) {
    removeFromCart(productId);
    return;
  }
  saveCart();
  updateCartCount();
  renderCartItems();
}

function saveCart() {
  localStorage.setItem('sqc-cart', JSON.stringify(cart));
}

// ─── Cart UI ──────────────────────────────────────────────────────────────────
function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function renderCartItems() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!container) return;

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <p>Your cart is empty.</p>
        <p class="cart-empty-sub">Start your side quest!</p>
      </div>
    `;
  } else {
    container.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-thumb" style="background: ${item.bg}">
          <span>${item.emoji}</span>
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-line-price">$${(item.price * item.qty).toFixed(2)}</div>
          <div class="cart-qty-controls">
            <button class="qty-btn" data-id="${item.id}" data-delta="-1" aria-label="Decrease quantity">−</button>
            <span class="qty-display">${item.qty}</span>
            <button class="qty-btn" data-id="${item.id}" data-delta="1" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button class="cart-item-remove" data-remove="${item.id}" aria-label="Remove ${item.name}">✕</button>
      </div>
    `).join('');
  }

  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

function openCartDrawer() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-overlay').classList.add('active');
  document.body.classList.add('no-scroll');
}

function closeCartDrawer() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('active');
  document.body.classList.remove('no-scroll');
}

// ─── Product Modal ────────────────────────────────────────────────────────────
async function openProductModal(productId) {
  const product = await window.SQCProducts.getById(productId);
  if (!product) return;

  const modal = document.getElementById('product-modal');
  modal.querySelector('.modal-image').style.background = product.bg;
  modal.querySelector('.modal-emoji').textContent = product.emoji;
  modal.querySelector('.modal-category').textContent = product.category;
  modal.querySelector('.modal-name').textContent = product.name;
  modal.querySelector('.modal-price').textContent = `$${product.price.toFixed(2)}`;
  modal.querySelector('.modal-description').textContent = product.description;
  modal.querySelector('.modal-add-cart').dataset.id = product.id;
  if (product.badge) {
    modal.querySelector('.modal-badge').textContent = product.badge;
    modal.querySelector('.modal-badge').style.display = 'inline-block';
  } else {
    modal.querySelector('.modal-badge').style.display = 'none';
  }

  modal.classList.add('active');
  document.body.classList.add('no-scroll');
  modal.querySelector('.modal-close').focus();
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('active');
  document.body.classList.remove('no-scroll');
}

// ─── Visual Feedback ──────────────────────────────────────────────────────────
function flashAddedEffect(productId) {
  const card = document.querySelector(`.product-card[data-id="${productId}"]`);
  if (!card) return;
  card.classList.add('added');
  setTimeout(() => card.classList.remove('added'), 900);
}

// ─── Category Filter ──────────────────────────────────────────────────────────
async function filterProducts(categorySlug) {
  const heading = document.querySelector('#shop .section-title');
  if (heading) {
    heading.textContent = categorySlug === 'all' ? 'Featured Products' : '...';
  }

  await loadProducts(categorySlug);

  if (heading && categorySlug !== 'all') {
    const all = await window.SQCProducts.getAll();
    const cat = all.find(p => p.categorySlug === categorySlug)?.category || 'Products';
    heading.textContent = cat;
  }

  document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
}

// ─── Header Scroll ────────────────────────────────────────────────────────────
function initHeaderScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;
  let lastY = window.scrollY;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 60);
    if (y > lastY && y > 200) {
      header.classList.add('hidden');
    } else {
      header.classList.remove('hidden');
    }
    lastY = y;
  }, { passive: true });
}

// ─── Scroll Spy ───────────────────────────────────────────────────────────────
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      }
    });
  }, { rootMargin: '-50% 0px -50% 0px' });

  sections.forEach(section => observer.observe(section));
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
function initEventListeners() {
  // Cart open
  const cartBtn = document.getElementById('cart-btn');
  if (cartBtn) cartBtn.addEventListener('click', openCartDrawer);

  // Cart close
  const cartClose = document.getElementById('cart-close');
  if (cartClose) cartClose.addEventListener('click', closeCartDrawer);

  const cartOverlay = document.getElementById('cart-overlay');
  if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);

  // Cart item interactions (delegated)
  const cartItems = document.getElementById('cart-items');
  if (cartItems) {
    cartItems.addEventListener('click', e => {
      const qtyBtn = e.target.closest('.qty-btn');
      const removeBtn = e.target.closest('[data-remove]');

      if (qtyBtn) {
        updateQty(parseInt(qtyBtn.dataset.id), parseInt(qtyBtn.dataset.delta));
      } else if (removeBtn) {
        removeFromCart(parseInt(removeBtn.dataset.remove));
      }
    });
  }

  // Product grid (delegated) — card click = modal, button click = add to cart
  const productsGrid = document.getElementById('products-grid');
  if (productsGrid) {
    productsGrid.addEventListener('click', e => {
      const addBtn = e.target.closest('.btn-add-cart');
      const card = e.target.closest('.product-card');

      if (addBtn) {
        e.stopPropagation();
        addToCart(parseInt(addBtn.dataset.id));
      } else if (card) {
        openProductModal(parseInt(card.dataset.id));
      }
    });

    // Keyboard support
    productsGrid.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.product-card');
        if (card) openProductModal(parseInt(card.dataset.id));
      }
    });
  }

  // Modal close
  const modalClose = document.getElementById('modal-close');
  if (modalClose) modalClose.addEventListener('click', closeProductModal);

  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeProductModal();
    });
    modal.querySelector('.modal-add-cart')?.addEventListener('click', e => {
      const id = parseInt(e.currentTarget.dataset.id);
      addToCart(id);
      closeProductModal();
    });
  }

  // Mobile menu
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', open);
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', false);
      });
    });
  }

  // Category tiles
  document.querySelectorAll('[data-filter]').forEach(tile => {
    tile.addEventListener('click', () => filterProducts(tile.dataset.filter));
  });

  // Escape closes drawers/modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeCartDrawer();
      closeProductModal();
    }
  });
}
