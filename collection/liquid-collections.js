if($('.page-wrap').hasClass('collection')) {

    if(!$('.collections-list').hasClass('ajax')) {

        /* Liquid Build --------------------------------*/


        /* builds and posts new url */
        function updateUrl() {
            /* base url */
            var baseUrl  = window.location.origin

            /* get filters */
            var tagFilters = buildTagFilters();  

            /* Queries */
            var queries = '';

            var updatedUrl = `${baseUrl}/collections/${collectionSlug}/${tagFilters}`;

            window.location.href = updatedUrl;
        }

        function buildTagFilters() {
            var tagString = '';
            $(".tag-filter").each(function() {
                var isSelected = $(this).hasClass('selected');
                var filterSlug = $(this).attr('data-filter');
                if(isSelected){
                    tagString += `${filterSlug}+`;
                }
            });

            var finalTags = tagString.slice(0,-1);
            return finalTags;
        }

        $('.collection-filter').on('click', function(){
            $('.collection-filter').removeClass('selected');
            $(this).addClass('selected');

            /* update global collection variable */
            collectionSlug = $(this).attr('data-collection');

            updateUrl();
        }); 


        $('.tag-filter').on('click', function() {
            $(this).toggleClass('selected');
            updateUrl();
        });

        /* Liquid Build --------------------------------*/
    }
};