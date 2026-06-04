async function applyCartDrawerDiscount() {
  const input = document.getElementById('CartDrawer-Discount');
  const code = input ? input.value.trim() : '';
  const btn = document.querySelector('.cart-discount-apply');

  if (!code) {
    alert('Please enter a discount code.');
    return;
  }

  if (btn) {
    btn.textContent = '...';
    btn.disabled = true;
  }

  try {
    // Shopify native AJAX discount application
    await fetch(window.Shopify.routes.root + 'cart/update.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/javascript'
      },
      body: JSON.stringify({ discount: code })
    });

    // To trigger a re-render of the Dawn cart drawer, we can fetch the cart again
    // and re-render sections. Since cart-drawer.js handles section rendering, we can trigger an event or manually refresh.
    // The easiest way is to mimic a cart update event or refresh the page if event is too complex.
    // Or we can just call the native fetchConfig logic if available.
    
    // Quick refresh of the cart drawer section
    const response = await fetch(`${window.location.pathname}?section_id=cart-drawer`);
    if (response.ok) {
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const newItems = doc.getElementById('CartDrawer-CartItems');
      const oldItems = document.getElementById('CartDrawer-CartItems');
      if (newItems && oldItems) oldItems.innerHTML = newItems.innerHTML;

      const newTotals = doc.querySelector('.cart-drawer__footer-totals');
      const oldTotals = document.querySelector('.cart-drawer__footer-totals');
      if (newTotals && oldTotals) oldTotals.innerHTML = newTotals.innerHTML;
      
      // Update form action to include discount code on checkout
      const form = document.getElementById('CartDrawer-Form');
      if (form) {
        const actionUrl = new URL(form.action, window.location.origin);
        actionUrl.searchParams.set('discount', code);
        form.action = actionUrl.toString();
      }

      if (btn) btn.textContent = 'Applied';
    }
  } catch (error) {
    console.error('Error applying discount:', error);
    alert('Error applying discount code.');
    if (btn) {
      btn.textContent = 'Apply';
      btn.disabled = false;
    }
  }
}

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
    }
  } catch (e) {
    console.error("Error adding to cart", e);
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

async function addUpsellToCart(variantId, btn) {
  if (btn) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;
  }

  try {
    const response = await fetch(window.Shopify.routes.root + 'cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{ id: variantId, quantity: 1 }]
      })
    });
    
    if (response.ok) {
      // Re-render cart drawer the Dawn way
      const res = await fetch(window.Shopify.routes.root + '?section_id=cart-drawer');
      const text = await res.text();
      const cart = document.querySelector('cart-drawer');
      if (cart) {
        cart.renderContents(new DOMParser().parseFromString(text, 'text/html'), variantId, false);
      }
    } else {
      console.error('Failed to add upsell');
      if (btn) {
        btn.textContent = btn.dataset.originalText;
        btn.disabled = false;
      }
    }
  } catch (error) {
    console.error(error);
    if (btn) {
      btn.textContent = btn.dataset.originalText;
      btn.disabled = false;
    }
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
