if($('.page-wrap').hasClass('collection')) {
    if($('.collections-list').hasClass('ajax')) {

        /* 
            Page Todos this version: 
                - pagination

            v1.1 
                - price slider
                - hookup min/maxPrice to url query and onload
                - remove liquid build from files or build out basic version
                - more sort by options
        */


        // Page State Data structure
        var pageData = {
            products: {},
            activeTags: {},
            url: {
                origin: '',
                collection: '',
                filters: [],
                query: [],
                sortBy: '',
            },
            minPrice: null,
            maxPrice: null
        }

        // ONLOAD ACTIONS --------------------------------

        // fire on first page load
        updatePage();

        // fire on backarrow hit
        window.addEventListener('popstate', function(event) {
            updatePage();
        }, false);


        function updatePage() {
            // build the url object values
            initializeUrlObject();
    
            // UI update sidebar with active status
            selectActiveCollection();
            selectActiveFilters();
            selectActiveSortBy();
    
            // build Collection
            buildCollection();

            // Set Collections Banner
            buildCollectionsBanner();
        }

        // END ON LOAD  -----------------------------------


        // UI functionality -------------------------------

        /* collection buttons */
        $('.collection-filter').on('click', function(){
            /* deselect selected collection */
            $('.collection-filter').removeClass('selected');

            /* select new collection */
            $(this).addClass('selected');
            
            /* update url  */
            pageData.url.collection = $(this).attr('data-collection');;
            updateUrl();

            /* build out new collection  */
            buildCollection();
            buildCollectionsBanner();

        });

        // tag filters 
        $('.tag-filter').on('click', function() {
            var isSelected = $(this).hasClass('selected');
            var filterSlug = $(this).attr('data-filter');

            if(isSelected) {
                $(this).removeClass('selected');
                clearFilter(filterSlug);
                updateUrl();
            } else {
                $(this).addClass('selected');
                addFilter(filterSlug);
                updateUrl();
            }

        });

        // price filter
        $('.price-filter-button').on('click', function() {
            pageData.minPrice = $('#min-price').val();
            pageData.maxPrice = $('#max-price').val();
            filterProducts();
        });

        // sort by Dropdown
        $('#sort-by-dropdown').change(() => {
            var sortByValue = $('#sort-by-dropdown').val();
            pageData.url.sortBy = sortByValue;
            updateQuery('sort_by', sortByValue);
        });

        $('.sort-by-checkbox-row').on('click', (e) => {
            /* update sorting */
            var sortByValue = $(e.target).attr('value');
            pageData.url.sortBy = sortByValue;
            updateQuery('sort_by', sortByValue);

            // Update UI
            closeSideMenus();
            $('.sort-by-checkbox-row').removeClass('selected');
            $(e.target).addClass('selected');
            
        });

        $(".clear-filters").on('click', function() {
            clearAll();
        });


        /* SIDEBAR UI CONTROLLERS */

        /* mobile sidebar open button functionality */
        $('#sidebar-filter-toggler').on('click', () => {
            $('.sidebar-filters, .sidebar-veil').removeClass('closed');
        });

        $('.sidebar-veil, .sidebar-closer').on('click', () => {
            closeSideMenus();
        });

        /* sort sidebar */
        $('#sidebar-sort-by-toggler').on('click', () => {
            $('.sort-by-mobile, .sidebar-veil').removeClass('closed');
        });

        function closeSideMenus() {
            $('.sort-by-mobile, .sidebar-filters, .sidebar-veil').addClass('closed');
        }
        /* filter sections open/close */
        $('.filter-controller').on('click', (event) => {
            var wrap = $(event.target).closest('.folding-filter-wrap');
            if(wrap.hasClass('open')){
                wrap.removeClass('open').addClass('closed');
            } else {
                wrap.removeClass('closed').addClass('open');
            }
        });



        /* function for filtering input to number only */
        $.fn.inputFilter = function(inputFilter) {
            return this.on("input keydown keyup mousedown mouseup select contextmenu drop", function() {
              if (inputFilter(this.value)) {
                this.oldValue = this.value;
                this.oldSelectionStart = this.selectionStart;
                this.oldSelectionEnd = this.selectionEnd;
              } else if (this.hasOwnProperty("oldValue")) {
                this.value = this.oldValue;
                this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
              }
            });
        };


        /* Price min/max Filtering letters */
        $("#min-price, #max-price").inputFilter(function(value) {
            return /^\d*$/.test(value);
        });

        // END UI functionality -----------------------------



        // HELPER FUNCTION COLLECTION----------------------- 

        function clearAll() {
            pageData.url.filters = [];
            pageData.url.query = [];
            pageData.url.sortBy = '';
            pageData.activeTags = {};
            pageData.minPrice = null;
            pageData.maxPrice =  null;
            $('#min-price, #max-price').val('')
            updateUrl();
            updatePage();
        }


        /* Update banner with collections default image */
        function buildCollectionsBanner() {
            if(pageData.url.collection === 'all') {
                $(".collection-banner-background-default").removeClass("hidden");
                $(".collection-banner-background").addClass("hidden");
            } else {
                $.getJSON(`/collections/${pageData.url.collection}.json`, function(response) {
                    var collection = response.collection;
                    $(".collection-banner-background-default").addClass("hidden");
                    $(".collection-banner-background").removeClass("hidden");
                    $('#collection-name').text(collection.title);
                    $(".collection-banner-background").css("background-image", `url(${collection.image.src})`);
                });
            }
        }

        // update the url query array then update the page
        function updateQuery(querySlug, value) {
            if(pageData.url.query) {
                var updatedQuery = _.map(pageData.url.query, query => {
                    var isSortBy = query.indexOf(querySlug) > -1;
                    var newQuery = isSortBy ? `sort_by=${value}` : query;
    
                    return newQuery;
                });
    
                pageData.url.query = updatedQuery; 
            } else {
                pageData.url.query = [`${querySlug}=${value}`];
            }
            updateUrl();
            filterProducts();
        }

        // build active tags object
        function updateActiveTags() {
            pageData.activeTags = {};
            _.each(pageData.url.filters, filter => {
                var slug = filter.split('-')[0];
                if(pageData.activeTags[slug]) {
                    if(pageData.activeTags[slug].indexOf('filter') === -1) {
                        pageData.activeTags[slug].push(filter);
                    }
                } else {
                    pageData.activeTags[slug] = [filter];
                }
            });
        }

        // filter Data by Tags
        function filterProducts() {

            // Filter by Tags
            var tagFilteredProducts = filterByTags(pageData.products);

            // Filter by product 
            var priceFiltered =  filterByPrice(tagFilteredProducts);
    
            // Sort by slug
            var sortedProducts = sortBy(priceFiltered);

            buildProducts(sortedProducts);
        }

        /* Add Filter to list and update product list */
        function addFilter(filterSlug) {
            pageData.url.filters = pageData.url.filters.concat(filterSlug);
            filterProducts();
        };

        // Remove Filter to list and update product list
        function clearFilter(filterSlug) {
            var getTypeSlug = filterSlug.split("-")[0];
            _.pull(pageData.url.filters, filterSlug);
            filterProducts();
        };

        // Tag Filtered Products
        function filterByTags(productList) {

            updateActiveTags();

            var listOfProducts = [];
            _.each(productList, product => {
                // products tags
                var productTags = _.get(product, 'tags');

                var displayProduct = true;

                // Check active tags and filter by them 
                _.forOwn(pageData.activeTags, function(value,key){
                    var tagMatch = false;

                    if(value.length === 0) {
                        // if there no tags push everything through 
                        tagMatch = true;

                    } else {
                        _.each(value, tag => {
    
                            var index = productTags.indexOf(tag);
    
                            if(index > -1) {
                                tagMatch = true;
                            }
                        });
                    }

                    if(!tagMatch) {
                        displayProduct = false;
                    }
                })

                if(displayProduct) {
                    listOfProducts.push(product)
                }
                
            });

            return listOfProducts;

        }

        // Sort list of products by slug 
        function sortBy(productList) {
            switch (pageData.url.sortBy) {
                case 'price-ascending':
                    return productList.sort((a, b) => parseFloat(a.variants[0].price) - parseFloat(b.variants[0].price));
                case 'price-descending':
                    return productList.sort((a, b) => parseFloat(b.variants[0].price) - parseFloat(a.variants[0].price));
                case 'title-ascending':
                    return productList.sort((a, b) => a.title.localeCompare(b.title));
                case 'title-descending':
                    return productList.sort((a, b) => b.title.localeCompare(a.title));
                case 'vendor-ascending':
                    return productList.sort((a, b) => a.vendor.localeCompare(b.vendor));
                case 'vendor-descending':
                    return productList.sort((a, b) => b.vendor.localeCompare(a.vendor));
                default:
                    return productList;
            }
        }

        // filter by price limits 
        function filterByPrice(productList) {
            return _.filter(productList, function(product) {
                var productPrice = parseFloat(product.variants[0].price);

                if(!pageData.minPrice && !pageData.maxPrice) {
                    return product;
                } else if(!pageData.maxPrice && (productPrice >= pageData.minPrice)) {
                    return product;
                } else if (!pageData.minPrice && (productPrice <= pageData.maxPrice)) {
                    return product;
                } else if(productPrice >= pageData.minPrice && productPrice <= pageData.maxPrice) {
                    return product;
                }
            });

        }

        /* select currently active option in sortby */
        function selectActiveSortBy() {
            if(pageData.url.sortBy) {
                $(`#sort-by-dropdown option[value=${pageData.url.sortBy}]`).attr('selected','selected');
            }
        }

        // Adjust image sizes down for product images via img url manipulation
        // Note: probably a better way to do this */
        function filterImageSize(imageUrl) {
            var sizeInjection = "_300x300_crop_center";

            if(imageUrl) {
                var urlArray = imageUrl.split(".jpg");
                var urlArray = imageUrl.split(".jpg");

                var jpgIndex
                var jpgIndex = imageUrl.indexOf(".jpg");
                var pngIndex = imageUrl.indexOf(".png");
                var finalUrl = imageUrl;
            
                if(jpgIndex > 0){
                    var urlArray = imageUrl.split(".jpg");
                    finalUrl = `${urlArray[0]}${sizeInjection}.jpg${urlArray[1]}`;
                } else if(pngIndex > 0) {
                    var urlArray = imageUrl.split(".png");
                    finalUrl = `${urlArray[0]}${sizeInjection}.png${urlArray[1]}`;
                } 

                return finalUrl;
            }
        }



        // build and inject products into DOM
        function buildProducts(productList) {
            var htmlOutput = ''
            var placeholderOverlay = `
                <div class="card-overlay">
                    <div class="top-row">
                        <p class="quick-buy-title">Quick Buy</p>
                        <div class="card-overlay-closer">Close X</div>
                    </div>
                    <div class="selectors">
                        <div class="selector">
                            <label for="">Select Size</label>
                            <select name="" id="">
                                <option value="1g">1g</option>
                                <option value="1g">2g</option>
                                <option value="1g">3g</option>
                                <option value="1g">4g</option>
                                <option value="1g">5g</option>
                            </select>
                        </div>
                        <div class="selector">
                            <label for="">Select Color</label>
                            <select name="" id="">
                                <option value="1g">Periwinkle Blue</option>
                                <option value="1g">2g</option>
                                <option value="1g">3g</option>
                                <option value="1g">4g</option>
                                <option value="1g">5g</option>
                            </select>
                        </div>
                        <div class="selector">
                            <label for="">Select Location</label>
                            <select name="" id="">
                                <option value="1g">123 Rocket Road</option>
                                <option value="1g">2g</option>
                                <option value="1g">3g</option>
                                <option value="1g">4g</option>
                                <option value="1g">5g</option>
                            </select>
                        </div>
                    </div>
                    <div class="button add-to-cart">
                        Add to Cart | $XX.XX
                    </div>
                </div>
            `;
            
            _.each(productList, product => {
                var productUrl = `${window.location.origin}/products/${product.handle}`;
                var productImage = product.images[0] ? filterImageSize(product.images[0].src) : 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png?format=webp&v=1530129081';
                var productCard = `
                        <div class="col-md-4 col-6">
                            <div class="product-card">
                                ${placeholderOverlay}
                                <a href="${productUrl}">
                                    <div class="product-image" style="background-image: url(${productImage});">
                                    </div>
                                    <div class="product-info">
                                        <p class="product-category">${product.product_type}</p>
                                        <p class="product-title">${product.title}</p>
                                        <p class="product-price">$${product.variants[0].price}</p>
                                    </div>
                                </a>
                                <div class="quick-buy-bar">
                                    <p>Quick Buy<span>+</span></p>
                                </div>
                            </div>
                        </div>
                    `;
                htmlOutput += productCard; 
            });

            if(htmlOutput === '') {
                htmlOutput = "<div class='col no-products'><h4>There are no products to display.  Try switching categories, searching, or <a href='/collections/all'>shop all</a>.</h4></div>"
            }

            $('#collection-injection').html(htmlOutput); 
        }



        // select active collection in sidebar 
        function selectActiveCollection() {
            $(".collection-filter").each(function() {
                var filterKey = $(this).attr('data-collection');
                if(filterKey === pageData.url.collection) {
                    $(this).addClass('selected');
                }
            });
        }

        /* select active filters in sidebar */
        function selectActiveFilters() {
            $(".tag-filter").each(function() {
                var filterKey = $(this).attr('data-filter');
                var inArray = pageData.url.filters && pageData.url.filters.includes(filterKey);
                if(inArray) {
                    $(this).addClass('selected');
                } else {
                    $(this).removeClass('selected');
                }
            });
        }


        function initializeUrlObject() {

            /* origin */
            var currentUrl = window.location.href;
            pageData.url.origin = window.location.origin;

            /* collection */
            var urlInfo = currentUrl.split("collections/")[1];
            pageData.url.collection = urlInfo && urlInfo.split("/")[0];

            /* filters */
            var filtersAndQuery = urlInfo && urlInfo.split("/")[1];
            var rawFilters = filtersAndQuery && filtersAndQuery.split("?")[0];
            pageData.url.filters = rawFilters ? rawFilters.split("+") : [];

            /* query */
            var rawQuery = currentUrl.split("?")[1] ? currentUrl.split("?")[1] : null;
            pageData.url.query = rawQuery ? rawQuery.split('&') : '';

            /* sortBy */
            pageData.url.query && _.each(pageData.url.query, query => {
                var querySplit = query.split('=');
                var queryType = querySplit[0];
                var queryValue = querySplit[1];

                if(queryType === 'sort_by') {
                    pageData.url.sortBy = queryValue;
                }
            });
            
        }

        function updateUrl() {

            /* create filterString */
            var filterString = '';
            _.each(pageData.url.filters, filter => {
                filterString += `${filter}+`;
            })
            var filterString = filterString.slice(0,-1);

            /* prep query for url */
            var queryString = '';
            _.each(pageData.url.query, query => {
                queryString += `${query}&`;
            });
            var filterQueryString = queryString && `?${queryString.slice(0,-1)}`;

            var urlString = `${pageData.url.origin}/collections/${pageData.url.collection}/${filterString}${filterQueryString}`;
            history.pushState(null,null, urlString);
        }

        function buildCollection() {
            $.getJSON(`/collections/${pageData.url.collection}/products.json?limit=250`, function(response) {
                pageData.products = response['products'];
                filterProducts();
            });
        }
    
        /* END JS BUILD --------------------------------*/


    }
};