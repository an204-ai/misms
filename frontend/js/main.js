/*
[Main Script]
Project: CloudServer - Responsive HTML5 Technology, Web Hosting and WHMCS Template
Version: 1.0
Author : themelooks.com
*/
;
(function(b) {
    var d = b(window),
        k = b("body"),
        h = b("#fakeLoader");

    if (h.length && typeof b.fn.fakeLoader === 'function') {
        h.fakeLoader({
            spinner: "spinner2",
            zIndex: "99999"
        });
    }

    function initBannerSlider() {
        var a = b(".banner-slider");
        if (a.length && typeof b.fn.owlCarousel === 'function' && !a.data("owlCarousel")) {
            a.owlCarousel({
                slideSpeed: 800,
                paginationSpeed: 800,
                singleItem: true,
                autoPlay: 6000,
                stopOnHover: true,
                addClassActive: true,
                pagination: true,
                navigation: false
            });
        }
    }

    b(function() {
        // 1. Initialize Banner Slider immediately on DOM ready
        initBannerSlider();

        b("[data-bg-img]").each(function() {
            var a = b(this);
            a.css("background-image", "url(" + a.data("bg-img") + ")").addClass("bg--img").removeAttr("data-bg-img");
        });

        var a = b('[data-sticky="true"]');
        if (a.length && typeof b.fn.sticky === 'function') {
            a.sticky({ zIndex: "999" });
        }

        var menu = b("#menu"),
            e = b(".off-canvas-menu"),
            p = b(".off-canvas-menu .nav > li > a");

        menu.on("click", ".menu-toggle-btn, .off-canvas-menu--close-btn, .off-canvas-menu-overlay", function(b) {
            b.preventDefault();
            e.toggleClass("menu-open");
        });

        p.on("click", function() {
            var a = b(this).parent("li");
            a.hasClass("opened") ? a.toggleClass("opened open") : a.siblings("li.opened").toggleClass("opened open");
        });

        if (typeof b.fn.validate === 'function') {
            b('[data-form-validation="true"] form').each(function() {
                b(this).validate({
                    errorPlacement: function() { return true; }
                });
            });

            var l = b("#contactForm"),
                status = b(".contact-form-status");
            if (l.length) {
                l.validate({
                    rules: {
                        contactName: "required",
                        contactEmail: { required: true, email: true },
                        contactSubject: "required",
                        contactMessage: "required"
                    },
                    errorPlacement: function() { return true; },
                    submitHandler: function(form) {
                        var formData = l.serialize();
                        b.ajax({
                            type: "POST",
                            url: l.attr("action"),
                            data: formData
                        }).done(function(res) {
                            status.show().html(res).delay(1000).fadeOut("slow");
                        });
                    }
                });
            }
        }

        if (typeof b.fn.owlCarousel === 'function') {
            var testimonials = b(".testimonial-slider");
            if (testimonials.length) {
                testimonials.owlCarousel({
                    slideSpeed: 700,
                    paginationSpeed: 700,
                    singleItem: true,
                    autoPlay: true,
                    addClassActive: true
                });
            }

            var pricing = b(".pricing--slider");
            if (pricing.length) {
                pricing.owlCarousel({
                    slideSpeed: 800,
                    paginationSpeed: 800,
                    items: 3,
                    itemsDesktop: [1199, 3],
                    itemsDesktopSmall: [991, 2],
                    itemsTablet: [767, 1]
                });
            }
        }

        var g = b("#vpsPricing");
        if (g.length && typeof b.fn.slider === 'function') {
            var q = g.find("#vpsSlider"),
                valEls = g.find("[data-put-value]"),
                hrefEls = g.find("[data-put-href]");

            var c = function(plans) {
                c.value = 1;
                c.max = plans.length - 1;
                c.changeValue = function(n, w) {
                    c.value = b.isEmptyObject(w) ? c.value : w.value;
                    q.find(".ui-slider-handle").html("<em>" + plans[c.value].title + "</em>");
                    valEls.each(function() {
                        var n = b(this);
                        n.text(plans[c.value][n.data("put-value")]);
                    });
                    hrefEls.attr("href", plans[c.value][hrefEls.data("put-href")]);
                };
                q.slider({
                    animate: "fast",
                    range: "min",
                    min: 0,
                    max: c.max,
                    value: c.value,
                    step: 1,
                    create: c.changeValue,
                    slide: c.changeValue
                });
            };

            b.getJSON("json/vps-plans.json", c).done(function() {
                var t = g.find(".vps-pricing--items"),
                    u = g.find(".vps-pricing--tag");
                u.css("height", t.height());
                d.on("resize", function() { u.css("height", t.height()); });
            });
        }

        var counterUpEls = b('[data-counter-up="true"]');
        if (counterUpEls.length && typeof b.fn.counterUp === 'function') {
            counterUpEls.counterUp({ delay: 10, time: 1000 });
        }

        if (typeof b.fn.countdown === 'function') {
            b("[data-counter-down]").each(function() {
                var el = b(this);
                el.countdown(el.data("counter-down"), function(event) {
                    b(this).html(event.strftime("%D Days %H:%M:%S"));
                });
            });
        }

        if (typeof b.fn.animatescroll === 'function') {
            b('[data-animate-scroll="true"]').on("click", function(event) {
                event.preventDefault();
                var target = b(this).attr("href");
                b(target).animatescroll({ padding: 65, easing: "easeInOutExpo", scrollSpeed: 2000 });
            });
        }

        var m = b(".gallery--items"),
            filterMenu = b(".gallery--filter-menu");
        if (m.length && typeof b.fn.isotope === 'function') {
            m.isotope({
                animationEngine: "best-available",
                itemSelector: ".gallery--item"
            });
            filterMenu.on("click", "a", function() {
                var link = b(this),
                    href = link.attr("href");
                m.isotope({ filter: "*" !== href ? '[data-cat~="' + href + '"]' : href });
                link.parent("li").addClass("active").siblings().removeClass("active");
                return false;
            });
        }

        if (m.length && typeof b.fn.magnificPopup === 'function') {
            m.magnificPopup({
                delegate: ".gallery--img a",
                type: "image",
                gallery: { enabled: true, navigateByImgClick: false },
                zoom: { enabled: true },
                callbacks: {
                    open: function() { this.currItem.el.addClass("active"); },
                    close: function() { this.currItem.el.removeClass("active"); }
                }
            });
        }

        var f = b("#map");
        if (f.length && typeof google !== 'undefined' && google.maps) {
            var map = new google.maps.Map(f[0], {
                center: { lat: f.data("map-latitude"), lng: f.data("map-longitude") },
                zoom: f.data("map-zoom"),
                scrollwheel: false,
                disableDefaultUI: true,
                zoomControl: true
            });
            if (typeof f.data("map-marker") !== 'undefined') {
                var markers = f.data("map-marker");
                for (var idx = 0; idx < markers.length; idx++) {
                    new google.maps.Marker({
                        position: { lat: markers[idx][0], lng: markers[idx][1] },
                        map: map,
                        animation: google.maps.Animation.DROP,
                        draggable: true
                    });
                }
            }
        }

        var v = b('[data-has-pricing-head="no"]');
        if (v.length) {
            var adjustPricingHeight = function() {
                v.children(".pricing--content").css("margin-top", v.siblings().find(".pt-head").outerHeight());
            };
            adjustPricingHeight();
            d.on("resize", adjustPricingHeight);
        }

        b("#domainPricing, #dedicatedPricing").find("table td").each(function() {
            var td = b(this);
            td.prepend('<span class="labelText">' + td.data("label") + "</span>");
        });
    });

    // Also re-trigger on window load
    d.on("load", function() {
        initBannerSlider();
    }).on("load scroll", function() {
        1 < d.scrollTop() ? k.addClass("scrolling") : k.removeClass("scrolling");
    });
})(jQuery);

