class CartDiscount {
  constructor() {
    this.init();
  }

  init() {
    const applyBtn = document.getElementById('CartDrawer-ApplyDiscount');
    if (!applyBtn) return;
    
    applyBtn.addEventListener('click', this.applyDiscount.bind(this));
  }

  async applyDiscount() {
    const input = document.getElementById('CartDrawer-DiscountInput');
    const msg = document.getElementById('CartDrawer-DiscountMessage');
    const code = input.value.trim();

    if (!code) {
      msg.textContent = 'Please enter a code.';
      msg.className = 'cart-discount-message error';
      return;
    }

    const btn = document.getElementById('CartDrawer-ApplyDiscount');
    btn.textContent = 'Applying...';
    btn.disabled = true;

    try {
      // Hit the Shopify discount URL to set the cookie
      await fetch(`/discount/${code}`);
      
      // Also apply it to the form action
      const form = document.getElementById('CartDrawer-Form');
      if (form) {
        // Append discount to form action so it carries over directly
        const actionUrl = new URL(form.action, window.location.origin);
        actionUrl.searchParams.set('discount', code);
        form.action = actionUrl.toString();
      }

      msg.textContent = `Discount '${code}' applied! Will reflect at checkout.`;
      msg.className = 'cart-discount-message success';
      
      // If we want to try and show it in the UI immediately, we can re-fetch the cart-drawer section
      this.refreshCartDrawer();

    } catch (e) {
      msg.textContent = 'Error applying discount.';
      msg.className = 'cart-discount-message error';
    } finally {
      btn.textContent = 'Apply';
      btn.disabled = false;
    }
  }

  async refreshCartDrawer() {
    // We can fetch the current page with the cart-drawer section to get updated HTML
    try {
      const response = await fetch(`${window.location.pathname}?section_id=cart-drawer`);
      if (response.ok) {
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Update Cart Items
        const newCartItems = doc.getElementById('CartDrawer-CartItems');
        const oldCartItems = document.getElementById('CartDrawer-CartItems');
        if (newCartItems && oldCartItems) {
          oldCartItems.innerHTML = newCartItems.innerHTML;
        }

        // Update Totals row
        const newTotals = doc.querySelector('.cart-drawer__footer-totals');
        const oldTotals = document.querySelector('.cart-drawer__footer-totals');
        if (newTotals && oldTotals) {
          oldTotals.innerHTML = newTotals.innerHTML;
        }
      }
    } catch(e) {
      console.warn("Failed to refresh cart drawer HTML", e);
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
          let recsHtml = `<h3 class="cart-recommendations-heading">You may also like</h3>`;
          
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

document.addEventListener('DOMContentLoaded', () => {
  new CartDiscount();
});
