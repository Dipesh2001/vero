class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 800);

    const facetForm = this.querySelector('form');
    facetForm.addEventListener('input', this.debouncedOnSubmit.bind(this));

    const facetWrapper = this.querySelector('#FacetsWrapperDesktop');
    if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
  }

  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    };
    window.addEventListener('popstate', onHistoryChange);
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach((element) => {
      element.classList.toggle('disabled', disable);
    });
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    const countContainer = document.getElementById('ProductCount');
    const countContainerDesktop = document.getElementById('ProductCountDesktop');
    const loadingSpinners = document.querySelectorAll(
      '.facets-container .loading__spinner, facet-filters-form .loading__spinner'
    );
    loadingSpinners.forEach((spinner) => spinner.classList.remove('hidden'));
    document.getElementById('ProductGridContainer').querySelector('.collection').classList.add('loading');
    if (countContainer) {
      countContainer.classList.add('loading');
    }
    if (countContainerDesktop) {
      countContainerDesktop.classList.add('loading');
    }

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = (element) => element.url === url;

      FacetFiltersForm.filterData.some(filterDataUrl)
        ? FacetFiltersForm.renderSectionFromCache(filterDataUrl, event)
        : FacetFiltersForm.renderSectionFromFetch(url, event);
    });

    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
  }

  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then((response) => response.text())
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, { html, url }];
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderProductCount(html);
        if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html.innerHTML);
      });
  }

  static renderSectionFromCache(filterDataUrl, event) {
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
    FacetFiltersForm.renderFilters(html, event);
    FacetFiltersForm.renderProductGridContainer(html);
    FacetFiltersForm.renderProductCount(html);
    if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html.innerHTML);
  }

  static renderProductGridContainer(html) {
    document.getElementById('ProductGridContainer').innerHTML = new DOMParser()
      .parseFromString(html, 'text/html')
      .getElementById('ProductGridContainer').innerHTML;

    document
      .getElementById('ProductGridContainer')
      .querySelectorAll('.scroll-trigger')
      .forEach((element) => {
        element.classList.add('scroll-trigger--cancel');
      });
  }

  static renderProductCount(html) {
    const count = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount').innerHTML;
    const container = document.getElementById('ProductCount');
    const containerDesktop = document.getElementById('ProductCountDesktop');
    container.innerHTML = count;
    container.classList.remove('loading');
    if (containerDesktop) {
      containerDesktop.innerHTML = count;
      containerDesktop.classList.remove('loading');
    }
    const loadingSpinners = document.querySelectorAll(
      '.facets-container .loading__spinner, facet-filters-form .loading__spinner'
    );
    loadingSpinners.forEach((spinner) => spinner.classList.add('hidden'));
  }

  static renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
    const facetDetailsElementsFromFetch = parsedHTML.querySelectorAll(
      '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
    );
    const facetDetailsElementsFromDom = document.querySelectorAll(
      '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
    );

    // Remove facets that are no longer returned from the server
    Array.from(facetDetailsElementsFromDom).forEach((currentElement) => {
      if (!Array.from(facetDetailsElementsFromFetch).some(({ id }) => currentElement.id === id)) {
        currentElement.remove();
      }
    });

    const matchesId = (element) => {
      const jsFilter = event ? event.target.closest('.js-filter') : undefined;
      return jsFilter ? element.id === jsFilter.id : false;
    };

    const facetsToRender = Array.from(facetDetailsElementsFromFetch).filter((element) => !matchesId(element));
    const countsToRender = Array.from(facetDetailsElementsFromFetch).find(matchesId);

    facetsToRender.forEach((elementToRender, index) => {
      const currentElement = document.getElementById(elementToRender.id);
      // Element already rendered in the DOM so just update the innerHTML
      if (currentElement) {
        document.getElementById(elementToRender.id).innerHTML = elementToRender.innerHTML;
      } else {
        if (index > 0) {
          const { className: previousElementClassName, id: previousElementId } = facetsToRender[index - 1];
          // Same facet type (eg horizontal/vertical or drawer/mobile)
          if (elementToRender.className === previousElementClassName) {
            document.getElementById(previousElementId).after(elementToRender);
            return;
          }
        }

        if (elementToRender.parentElement) {
          document.querySelector(`#${elementToRender.parentElement.id} .js-filter`).before(elementToRender);
        }
      }
    });

    FacetFiltersForm.renderActiveFacets(parsedHTML);
    FacetFiltersForm.renderAdditionalElements(parsedHTML);

    if (countsToRender) {
      const closestJSFilterID = event.target.closest('.js-filter').id;

      if (closestJSFilterID) {
        FacetFiltersForm.renderCounts(countsToRender, event.target.closest('.js-filter'));
        FacetFiltersForm.renderMobileCounts(countsToRender, document.getElementById(closestJSFilterID));

        const newFacetDetailsElement = document.getElementById(closestJSFilterID);
        const newElementSelector = newFacetDetailsElement.classList.contains('mobile-facets__details')
          ? `.mobile-facets__close-button`
          : `.facets__summary`;
        const newElementToActivate = newFacetDetailsElement.querySelector(newElementSelector);

        const isTextInput = event.target.getAttribute('type') === 'text';

        if (newElementToActivate && !isTextInput) newElementToActivate.focus();
      }
    }
  }

  static renderActiveFacets(html) {
    const activeFacetElementSelectors = ['.active-facets-mobile', '.active-facets-desktop'];

    activeFacetElementSelectors.forEach((selector) => {
      const activeFacetsElement = html.querySelector(selector);
      const domElements = document.querySelectorAll(selector);
      domElements.forEach((domEl) => {
        if (activeFacetsElement) {
          // Active filters exist — update content
          domEl.innerHTML = activeFacetsElement.innerHTML;
          domEl.style.display = '';
        } else {
          // No active filters in new HTML — clear and hide the container
          domEl.innerHTML = '';
          domEl.style.display = 'none';
        }
      });
    });

    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    const mobileElementSelectors = ['.mobile-facets__open', '.mobile-facets__count', '.sorting'];

    mobileElementSelectors.forEach((selector) => {
      if (!html.querySelector(selector)) return;
      const domEl = document.querySelector(selector);
      if (domEl) domEl.innerHTML = html.querySelector(selector).innerHTML;
    });

    // Guard: only call bindEvents if the mobile drawer still exists
    const mobileForm = document.getElementById('FacetFiltersFormMobile');
    if (mobileForm) {
      const drawer = mobileForm.closest('menu-drawer');
      if (drawer && typeof drawer.bindEvents === 'function') drawer.bindEvents();
    }
  }

  static renderCounts(source, target) {
    const targetSummary = target.querySelector('.facets__summary');
    const sourceSummary = source.querySelector('.facets__summary');

    if (sourceSummary && targetSummary) {
      targetSummary.outerHTML = sourceSummary.outerHTML;
    }

    const targetHeaderElement = target.querySelector('.facets__header');
    const sourceHeaderElement = source.querySelector('.facets__header');

    if (sourceHeaderElement && targetHeaderElement) {
      targetHeaderElement.outerHTML = sourceHeaderElement.outerHTML;
    }

    const targetWrapElement = target.querySelector('.facets-wrap');
    const sourceWrapElement = source.querySelector('.facets-wrap');

    if (sourceWrapElement && targetWrapElement) {
      const isShowingMore = Boolean(target.querySelector('show-more-button .label-show-more.hidden'));
      if (isShowingMore) {
        sourceWrapElement
          .querySelectorAll('.facets__item.hidden')
          .forEach((hiddenItem) => hiddenItem.classList.replace('hidden', 'show-more-item'));
      }

      targetWrapElement.outerHTML = sourceWrapElement.outerHTML;
    }
  }

  static renderMobileCounts(source, target) {
    const targetFacetsList = target.querySelector('.mobile-facets__list');
    const sourceFacetsList = source.querySelector('.mobile-facets__list');

    if (sourceFacetsList && targetFacetsList) {
      targetFacetsList.outerHTML = sourceFacetsList.outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  }

  static getSections() {
    return [
      {
        section: document.getElementById('product-grid').dataset.id,
      },
    ];
  }

  createSearchParams(form) {
    if (!form || !(form instanceof HTMLFormElement)) return '';
    const formData = new FormData(form);
    return new URLSearchParams(formData).toString();
  }

  onSubmitForm(searchParams, event) {
    FacetFiltersForm.renderPage(searchParams, event);
  }

  onSubmitHandler(event) {
    event.preventDefault();
    const sortFilterForms = document.querySelectorAll('facet-filters-form form');
    const targetEl = event.target;
    const targetClassName = (targetEl && targetEl.className) ? targetEl.className : '';
    const closestForm = targetEl ? targetEl.closest('form') : null;
    const closestFormId = closestForm ? closestForm.id : '';

    if (typeof targetClassName === 'string' && targetClassName.indexOf('mobile-facets__checkbox') !== -1) {
      const searchParams = this.createSearchParams(closestForm);
      this.onSubmitForm(searchParams, event);
    } else {
      const forms = [];
      const isMobileFilterDrawer = closestFormId === 'FacetFiltersFormMobile';
      const isMobileSortBar = closestFormId === 'FacetMobileSortForm';

      sortFilterForms.forEach((form) => {
        if (isMobileFilterDrawer) {
          // Mobile filter drawer: use its own form
          if (form.id === 'FacetFiltersFormMobile') {
            const params = this.createSearchParams(form);
            if (params) forms.push(params);
          }
        } else if (isMobileSortBar) {
          // Mobile sort bar: combine sort with any active desktop filter
          if (form.id === 'FacetMobileSortForm' || form.id === 'FacetFiltersForm') {
            const params = this.createSearchParams(form);
            if (params) forms.push(params);
          }
        } else {
          // Desktop: combine sort + filter forms
          if (form.id === 'FacetSortForm' || form.id === 'FacetFiltersForm' || form.id === 'FacetSortDrawerForm') {
            const params = this.createSearchParams(form);
            if (params) forms.push(params);
          }
        }
      });
      this.onSubmitForm(forms.join('&'), event);
    }
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();
    const url =
      event.currentTarget.href.indexOf('?') == -1
        ? ''
        : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
    FacetFiltersForm.renderPage(url);
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

class PriceRange extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.textInputs = this.querySelectorAll('input[type="text"], input[type="number"]');
    this.rangeInputs = this.querySelectorAll('input[type="range"]');
    this.track = this.querySelector('.price-slider-track');
    
    this.textInputs.forEach((element) => {
      element.addEventListener('change', this.onTextChange.bind(this));
      element.addEventListener('keydown', this.onKeyDown.bind(this));
    });
    
    this.rangeInputs.forEach((element) => {
      element.addEventListener('input', this.onRangeSliderInput.bind(this));
      element.addEventListener('change', this.onRangeSliderChange.bind(this));
    });
    
    // Ensure inputs are pre-filled with min/max default values if they are blank on load
    if (this.textInputs.length >= 2) {
      const minInput = this.textInputs[0];
      const maxInput = this.textInputs[1];
      const maxLimit = maxInput.getAttribute('data-max') || '0.00';
      
      if (!minInput.value || minInput.value.trim() === '') {
        minInput.value = '0.00';
      }
      if (!maxInput.value || maxInput.value.trim() === '') {
        maxInput.value = maxLimit;
      }
    }

    this.setMinAndMaxValues();
    this.syncTextToRange();
    this.updateSliderTrack();
  }

  onTextChange(event) {
    this.adjustToValidValues(event.currentTarget);
    this.setMinAndMaxValues();
    this.syncTextToRange();
    this.updateSliderTrack();
  }

  onRangeSliderInput(event) {
    this.syncRangeToText(event.currentTarget);
    this.updateSliderTrack();
  }

  onRangeSliderChange(event) {
    const textInput = event.currentTarget.classList.contains('min-range-slider') ? this.textInputs[0] : this.textInputs[1];
    if (textInput) {
      textInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  syncTextToRange() {
    if (!this.rangeInputs || this.rangeInputs.length < 2 || !this.textInputs || this.textInputs.length < 2) return;
    const minVal = parseFloat(this.textInputs[0].value) || 0;
    const maxVal = parseFloat(this.textInputs[1].value) || parseFloat(this.rangeInputs[1].getAttribute('max')) || 10000;
    
    this.rangeInputs[0].value = minVal;
    this.rangeInputs[1].value = maxVal;
  }

  syncRangeToText(activeSlider) {
    if (!this.rangeInputs || this.rangeInputs.length < 2 || !this.textInputs || this.textInputs.length < 2) return;
    let minVal = parseFloat(this.rangeInputs[0].value) || 0;
    let maxVal = parseFloat(this.rangeInputs[1].value) || 0;

    if (activeSlider.classList.contains('min-range-slider')) {
      if (minVal > maxVal) {
        minVal = maxVal;
        this.rangeInputs[0].value = minVal;
      }
    } else {
      if (maxVal < minVal) {
        maxVal = minVal;
        this.rangeInputs[1].value = maxVal;
      }
    }

    this.textInputs[0].value = minVal.toFixed(2);
    this.textInputs[1].value = maxVal.toFixed(2);
    
    this.setMinAndMaxValues();
  }

  updateSliderTrack() {
    if (!this.track || !this.rangeInputs || this.rangeInputs.length < 2) return;
    const min = parseFloat(this.rangeInputs[0].min) || 0;
    const max = parseFloat(this.rangeInputs[0].max) || 100;
    const val1 = parseFloat(this.rangeInputs[0].value) || 0;
    const val2 = parseFloat(this.rangeInputs[1].value) || max;
    
    const range = max - min;
    const percent1 = range > 0 ? ((val1 - min) / range) * 100 : 0;
    const percent2 = range > 0 ? ((val2 - min) / range) * 100 : 100;
    
    this.track.style.left = percent1 + '%';
    this.track.style.right = (100 - percent2) + '%';
  }

  onKeyDown(event) {
    if (event.metaKey) return;

    const pattern = /[0-9]|\.|,|'| |Tab|Backspace|Enter|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Delete|Escape/;
    if (!event.key.match(pattern)) event.preventDefault();
  }

  setMinAndMaxValues() {
    if (!this.textInputs || this.textInputs.length < 2) return;
    const minInput = this.textInputs[0];
    const maxInput = this.textInputs[1];
    if (maxInput.value) minInput.setAttribute('data-max', maxInput.value);
    if (minInput.value) maxInput.setAttribute('data-min', minInput.value);
    if (minInput.value === '') maxInput.setAttribute('data-min', 0);
    if (maxInput.value === '') minInput.setAttribute('data-max', maxInput.getAttribute('data-max'));
  }

  adjustToValidValues(input) {
    if (!this.textInputs || this.textInputs.length < 2) return;
    if (input.value.trim() === '') {
      if (input === this.textInputs[0]) {
        input.value = '0.00';
      } else {
        input.value = input.getAttribute('data-max') || '0.00';
      }
    }
    const value = Number(input.value);
    const min = Number(input.getAttribute('data-min'));
    const max = Number(input.getAttribute('data-max'));

    if (value < min) input.value = min.toFixed(2);
    else if (value > max) input.value = max.toFixed(2);
    else input.value = value.toFixed(2);
  }
}

customElements.define('price-range', PriceRange);

class FacetRemove extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const facetLink = this.querySelector('a');
    if (facetLink) {
      facetLink.setAttribute('role', 'button');
      facetLink.addEventListener('click', this.closeFilter.bind(this));
      facetLink.addEventListener('keyup', (event) => {
        event.preventDefault();
        if (event.code.toUpperCase() === 'SPACE') this.closeFilter(event);
      });
    }
  }

  closeFilter(event) {
    event.preventDefault();
    const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
    form.onActiveFilterClick(event);
  }
}

customElements.define('facet-remove', FacetRemove);

// Global click event interception to completely prevent Vertical Filter collapses on Desktop (>= 750px)
document.addEventListener('click', function(e) {
  if (window.innerWidth >= 750) {
    const verticalSummary = e.target.closest('.facets-vertical details.facets__disclosure-vertical summary');
    if (verticalSummary) {
      e.preventDefault();
    }
  }
}, { capture: true });

