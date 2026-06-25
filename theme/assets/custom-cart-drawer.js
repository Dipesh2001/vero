async function applyCartDrawerDiscount() {
  const input = document.getElementById('CartDrawer-Discount');
  const code = input ? input.value.trim().toUpperCase() : '';
  const btn = document.querySelector('.cart-discount-apply');
  const section = document.querySelector('.cart-discount-section');

  if (!code) {
    input && input.focus();
    if (window.showCartErrorToast) {
      window.showCartErrorToast('Please enter a discount code.');
    }
    return;
  }

  // Loading state
  if (btn) {
    btn.textContent = '...';
    btn.disabled = true;
  }

  try {
    // Shopify discount codes are applied at checkout URL — store the code and update checkout URL
    // The /discount/:code endpoint sets a session cookie that applies the discount at checkout
    const discountRes = await fetch(`${window.Shopify.routes.root}discount/${encodeURIComponent(code)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'manual' // don't follow redirect, just acknowledge
    });

    // Update the checkout button's form action to include the discount param
    const form = document.getElementById('CartDrawer-Form');
    if (form) {
      const actionUrl = new URL(form.action || '/checkout', window.location.origin);
      actionUrl.searchParams.set('discount', code);
      form.action = actionUrl.toString();
    }

    // Also persist for session (store in sessionStorage so it survives section re-renders)
    try { sessionStorage.setItem('cart_discount_code', code); } catch(e) {}

    // Success state
    if (btn) {
      btn.textContent = '✓ Applied';
      btn.style.backgroundColor = '#2e7d32';
      btn.disabled = false;
    }
    if (input) input.value = code;

    // Slide back to toggle view after 2s and update toggle text
    setTimeout(() => {
      if (section) section.classList.remove('show-input');
      const sub = section && section.querySelector('.cart-coupon-sub');
      if (sub) {
        sub.textContent = `"${code}" applied!`;
        sub.style.color = '#2e7d32';
      }
      // Reset button
      if (btn) {
        btn.textContent = 'Apply';
        btn.style.backgroundColor = '';
        btn.disabled = false;
      }
    }, 2000);

  } catch (error) {
    console.error('Error applying discount:', error);
    if (window.showCartErrorToast) {
      window.showCartErrorToast('Could not apply discount code. Please try again.');
    }
    if (btn) {
      btn.textContent = 'Apply';
      btn.disabled = false;
    }
  }
}

let isRestoringDiscount = false;
function restoreCartDrawerDiscount() {
  if (isRestoringDiscount) return;
  try {
    const saved = sessionStorage.getItem('cart_discount_code');
    if (!saved) return;

    isRestoringDiscount = true;
    const form = document.getElementById('CartDrawer-Form');
    if (form) {
      const actionUrl = new URL(form.action || '/checkout', window.location.origin);
      if (actionUrl.searchParams.get('discount') !== saved) {
        actionUrl.searchParams.set('discount', saved);
        form.action = actionUrl.toString();
      }
    }
    const sub = document.querySelector('.cart-coupon-sub');
    if (sub && sub.textContent !== `"${saved}" applied!`) {
      sub.textContent = `"${saved}" applied!`;
      sub.style.color = '#2e7d32';
    }
  } catch(e) {
    console.error('Error restoring discount:', e);
  } finally {
    isRestoringDiscount = false;
  }
}

// Set up delegated events and mutation observer on page load
document.addEventListener('DOMContentLoaded', () => {
  // 1. Event delegation for coupon drawer slider views
  document.addEventListener('click', (e) => {
    // Check if clicked the toggle or any child of it
    const toggle = e.target.closest('.cart-discount-toggle');
    if (toggle) {
      const section = toggle.closest('.cart-discount-section');
      if (section) {
        section.classList.add('show-input');
        const input = section.querySelector('.cart-discount-input');
        setTimeout(() => {
          if (input) input.focus();
        }, 350);
      }
      return;
    }

    // Check if clicked back button or any child of it
    const backBtn = e.target.closest('.cart-discount-back');
    if (backBtn) {
      const section = backBtn.closest('.cart-discount-section');
      if (section) {
        section.classList.remove('show-input');
      }
      return;
    }
  });

  // Apply discount on enter key
  document.addEventListener('keydown', (e) => {
    if (e.target && e.target.id === 'CartDrawer-Discount' && e.key === 'Enter') {
      e.preventDefault();
      applyCartDrawerDiscount();
    }
  });

  // 2. Set up MutationObserver to re-apply discount parameter when cart updates
  const cartDrawer = document.getElementById('CartDrawer');
  if (cartDrawer) {
    const observer = new MutationObserver(() => {
      restoreCartDrawerDiscount();
    });
    observer.observe(cartDrawer, { childList: true, subtree: true });
  }

  // 3. Restore discount code initially
  restoreCartDrawerDiscount();
});




class CartRecommendations extends HTMLElement {
  constructor() {
    super();
    this.wrapper = this.querySelector('.cart-recommendations-wrapper');
  }

  connectedCallback() {
    this.fetchRecommendations();
  }

  async fetchRecommendations() {
    const url = this.dataset.url;
    if (!url) return;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract the products from the recommendations section
        // Note: this assumes the recommendations endpoint returns a valid section structure
        const items = doc.querySelectorAll('.grid__item .card-wrapper');
        
        if (items.length > 0) {
          let recsHtml = `<h3 class="cart-recommendations-heading">Grab More</h3>`;
          
          items.forEach((item, index) => {
            if (index >= 4) return; // Limit to 4
            
            // Extract basics from standard Dawn product card
            const titleEl = item.querySelector('.card__heading a');
            const priceEl = item.querySelector('.price-item--regular, .price-item--sale');
            const imgEl = item.querySelector('img');
            const formEl = item.querySelector('form');
            
            if (!titleEl || !imgEl) return;
            
            const title = titleEl.textContent.trim();
            const url = titleEl.href;
            const price = priceEl ? priceEl.textContent.trim() : '';
            const imgSrc = imgEl.src;
            const variantInput = formEl ? formEl.querySelector('input[name="id"]') : null;
            const variantId = variantInput ? variantInput.value : '';

            recsHtml += `
              <div class="cart-recommendation-item">
                <a href="${url}"><img src="${imgSrc}" alt="${title}"></a>
                <div class="cart-recommendation-item__info">
                  <a href="${url}" style="text-decoration:none;"><p class="cart-recommendation-item__title">${title}</p></a>
                  <span class="cart-recommendation-item__price">${price}</span>
                </div>
                ${variantId ? `
                <button type="button" class="cart-recommendation-item__add" onclick="addToCartFromRecs('${variantId}')">Add</button>
                ` : ''}
              </div>
            `;
          });

          this.wrapper.innerHTML = recsHtml;
        } else {
          this.wrapper.innerHTML = '';
        }
      }
    } catch (e) {
      console.warn("Failed to fetch product recommendations", e);
    }
  }
}

if (!customElements.get('cart-recommendations')) {
  customElements.define('cart-recommendations', CartRecommendations);
}

// Global helper to add to cart from recommendations
window.addToCartFromRecs = async function(variantId) {
  const formData = {
    'items': [{
      'id': parseInt(variantId),
      'quantity': 1
    }],
    'sections': 'cart-drawer,cart-icon-bubble'
  };

  try {
    const res = await fetch(window.Shopify.routes.root + 'cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    if (res.ok) {
      const data = await res.json();
      
      // Update HTML from returned sections
      if (data.sections) {
        if (data.sections['cart-drawer']) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(data.sections['cart-drawer'], 'text/html');
          
          const newCartItems = doc.getElementById('CartDrawer-CartItems');
          const oldCartItems = document.getElementById('CartDrawer-CartItems');
          if (newCartItems && oldCartItems) {
            oldCartItems.innerHTML = newCartItems.innerHTML;
          }

          const newTotals = doc.querySelector('.cart-drawer__footer-totals');
          const oldTotals = document.querySelector('.cart-drawer__footer-totals');
          if (newTotals && oldTotals) {
            oldTotals.innerHTML = newTotals.innerHTML;
          }
        }
        
        if (data.sections['cart-icon-bubble']) {
          const bubble = document.getElementById('cart-icon-bubble');
          if (bubble) bubble.innerHTML = data.sections['cart-icon-bubble'];
        }
      }
      else {
        const errorData = await res.json().catch(() => ({}));
        if (window.showCartErrorToast) {
          window.showCartErrorToast(errorData.description || errorData.message || 'Error adding item to cart.');
        }
      }
    }
  } catch (e) {
    console.error("Error adding to cart", e);
    if (window.showCartErrorToast) {
      window.showCartErrorToast('Network error occurred.');
    }
  }
};

class CartDrawerRecommendations extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.initSwiper();

    const productId = this.dataset.productId;
    if (!productId) return;

    fetch(`${window.Shopify.routes.root}recommendations/products?product_id=${productId}&section_id=cart-drawer-recommendations&intent=related`)
      .then(response => response.text())
      .then(text => {
        const html = document.createElement('div');
        html.innerHTML = text;
        const recommendations = html.querySelector('.custom-cart-recommendations');
        
        if (recommendations && recommendations.querySelector('.custom-upsell-item')) {
          this.innerHTML = recommendations.outerHTML;
          this.classList.remove('hidden');
          this.initSwiper();
        } else {
          this.innerHTML = '';
          this.classList.add('hidden');
        }
      })
      .catch(e => console.error(e));
  }

  initSwiper() {
    if (typeof Swiper !== 'undefined') {
      new Swiper(this.querySelector('.cart-upsell-swiper'), {
        slidesPerView: 1,
        spaceBetween: 16,
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        breakpoints: {
          750: {
            slidesPerView: 1
          }
        }
      });
      
      const swatchContainers = this.querySelectorAll('.upsell-swatches-container.swiper');
      swatchContainers.forEach(container => {
        new Swiper(container, {
          slidesPerView: 'auto',
          spaceBetween: 6,
          navigation: {
            nextEl: container.querySelector('.upsell-swatch-next'),
            prevEl: container.querySelector('.upsell-swatch-prev'),
          }
        });
      });
    }
  }
}
customElements.define('cart-drawer-recommendations', CartDrawerRecommendations);

/**
 * Called when a color swatch is clicked in an upsell card.
 * Updates: image, variant title, price, discount badge, selected variant ID on the card.
 */
function upsellSwatchClick(swatchEl) {
  const card = swatchEl.closest('.custom-upsell-item');
  if (!card) return;

  // Update selected variant on card
  const variantId = swatchEl.dataset.variantId;
  card.dataset.selectedVariant = variantId;

  // -- Image --
  const imgEl = card.querySelector('.upsell-product-img');
  const imgUrl = swatchEl.dataset.variantImage;
  if (imgEl && imgUrl) {
    imgEl.src = imgUrl;
    imgEl.style.opacity = '0.5';
    imgEl.onload = () => { imgEl.style.opacity = '1'; };
  }

  // -- Variant title --
  const titleEl = card.querySelector('.upsell-variant-title');
  if (titleEl) {
    titleEl.textContent = swatchEl.dataset.variantTitle || '';
  }

  // -- Price row --
  const priceRow = card.querySelector('.upsell-price-row');
  if (priceRow) {
    const hasDiscount = swatchEl.dataset.variantHasDiscount === 'true';
    if (hasDiscount) {
      priceRow.innerHTML = `
        <span class="upsell-price-sale">${swatchEl.dataset.variantPrice}</span>
        <span class="upsell-price-compare">${swatchEl.dataset.variantCompare}</span>
        <span class="upsell-discount-badge">${swatchEl.dataset.variantDiscount}%</span>
      `;
    } else {
      priceRow.innerHTML = `<span class="upsell-price">${swatchEl.dataset.variantPrice}</span>`;
    }
  }

  // -- Active swatch highlight --
  card.querySelectorAll('.upsell-swatch-item').forEach(s => s.classList.remove('is-selected'));
  swatchEl.classList.add('is-selected');
}

/**
 * Adds the currently selected upsell variant to the cart.
 * Handles success (re-renders drawer) and errors cleanly without false error toasts.
 */
async function addUpsellToCart(variantId, btn) {
  if (!variantId) {
    if (window.showCartErrorToast) window.showCartErrorToast('Please select a variant.');
    return;
  }

  if (btn) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;
  }

  let addedSuccessfully = false;

  try {
    // Step 1: Add to cart and fetch rendered section HTML
    const addResponse = await fetch(window.Shopify.routes.root + 'cart/add.js', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        items: [{ id: parseInt(variantId), quantity: 1 }],
        sections: 'cart-drawer'
      })
    });

    if (!addResponse.ok) {
      let errMsg = 'Failed to add item to cart.';
      try {
        const errData = await addResponse.json();
        errMsg = errData.description || errData.message || errMsg;
      } catch(e) {}
      if (window.showCartErrorToast) window.showCartErrorToast(errMsg);
      if (btn) { btn.textContent = btn.dataset.originalText || 'Add'; btn.disabled = false; }
      return;
    }

    const data = await addResponse.json();
    addedSuccessfully = true;

    // Show success state immediately
    if (btn) {
      btn.textContent = '✓ Added';
      btn.style.backgroundColor = '#2e7d32';
    }

    // Step 2: Remove the item from client-side recommendation swiper instantly
    const card = btn.closest('.custom-upsell-item');
    if (card) {
      const slide = card.closest('.swiper-slide');
      if (slide && window.Swiper) {
        const swiperContainer = slide.closest('.cart-upsell-swiper');
        if (swiperContainer && swiperContainer.swiper) {
          const swiper = swiperContainer.swiper;
          const slideIndex = Array.from(swiper.slides).indexOf(slide);
          if (slideIndex > -1) {
            swiper.removeSlide(slideIndex);
            swiper.update();
          }
        } else {
          slide.remove();
        }
      } else {
        card.remove();
      }
    }

    // Check if any upsell cards are left. If not, hide recommendations container
    const recommendations = document.querySelector('cart-drawer-recommendations');
    if (recommendations) {
      const remainingItems = recommendations.querySelectorAll('.custom-upsell-item');
      if (remainingItems.length === 0) {
        recommendations.innerHTML = '';
        recommendations.classList.add('hidden');
      }
    }

    // Step 3: Re-render cart drawer contents (this opens/updates the drawer)
    const drawerEl = document.querySelector('cart-drawer');
    if (drawerEl && typeof drawerEl.renderContents === 'function') {
      drawerEl.renderContents(data);
    }

  } catch (networkErr) {
    if (!addedSuccessfully) {
      console.error('Network error adding upsell:', networkErr);
      if (window.showCartErrorToast) window.showCartErrorToast('Network error. Please try again.');
    }
  } finally {
    // Reset button after 1.5s
    setTimeout(() => {
      if (btn) {
        btn.textContent = btn.dataset.originalText || 'Add';
        btn.style.backgroundColor = '';
        btn.disabled = false;
      }
    }, 1500);
  }
}


// Fix stuck spinner on quantity errors
document.addEventListener('DOMContentLoaded', () => {
  const drawer = document.querySelector('cart-drawer');
  if (!drawer) return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.target.classList && mutation.target.classList.contains('cart-item__error-text')) {
        const cartItem = mutation.target.closest('.custom-cart-item');
        if (cartItem && cartItem.classList.contains('item-updating')) {
          cartItem.classList.remove('item-updating');
        }
      }
    });
  });

  observer.observe(drawer, { childList: true, subtree: true, characterData: true });
});
