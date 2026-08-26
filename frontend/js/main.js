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
    h.length && h.fakeLoader({
        spinner: "spinner2",
        zIndex: "99999"
    });
    b(function() {
        b("[data-bg-img]").each(function() {
            var a = b(this);
            a.css("background-image", "url(" + a.data("bg-img") + ")").addClass("bg--img").removeAttr("data-bg-img")
        });
        // var a = b("[data-bg-video]");

        // a.length && a.tubular({
        //     videoId: a.data("bg-video"),
        //     wrapperZIndex: 0
        // });
        
        a = b('[data-sticky="true"]');
        a.length && a.sticky({
            zIndex: "999"
        });
        var a = b("#menu"),
            e = b(".off-canvas-menu"),
            p = b(".off-canvas-menu .nav > li > a");
        a.on("click", ".menu-toggle-btn, .off-canvas-menu--close-btn, .off-canvas-menu-overlay", function(b) {
            b.preventDefault();
            e.toggleClass("menu-open")
        });
        p.one("click", function() {
            var a = b(this).parent("li");
            a.hasClass("opened") ? a.toggleClass("opened open") : a.siblings("li.opened").toggleClass("opened open")
        });
        b('[data-form-validation="true"] form').each(function() {
            b(this).validate({
                errorPlacement: function(b, a) {
                    return !0
                }
            })
        });
        var l = b("#contactForm"),
            k = b(".contact-form-status");
        l.length && l.validate({
            rules: {
                contactName: "required",
                contactEmail: {
                    required: !0,
                    email: !0
                },
                contactSubject: "required",
                contactMessage: "required"
            },
            errorPlacement: function(b, a) {
                return !0
            },
            submitHandler: function(a) {
                a = l.serialize();
                b.ajax({
                    type: "POST",
                    url: l.attr("action"),
                    data: a
                }).done(function(b) {
                    k.show().html(b).delay(1E3).fadeOut("slow")
                })
            }
        });
        a = b(".testimonial-slider");
        a.length && a.owlCarousel({
            slideSpeed: 700,
            paginationSpeed: 700,
            singleItem: !0,
            autoPlay: !0,
            addClassActive: !0
        });
        a = b(".pricing--slider");
        a.length && a.owlCarousel({
            slideSpeed: 800,
            paginationSpeed: 800,
            items: 3,
            itemsDesktop: [1199, 3],
            itemsDesktopSmall: [991, 2],
            itemsTablet: [767, 1]
        });
        var g = b("#vpsPricing"),
            q, h, r, c, t, u;
        q = g.find("#vpsSlider");
        h = g.find("[data-put-value]");
        r = g.find("[data-put-href]");
        c = function(a) {
            c.value = 1;
            c.max = a.length - 1;
            c.changeValue = function(n, w) {
                c.value = b.isEmptyObject(w) ? c.value : w.value;
                q.find(".ui-slider-handle").html("<em>" + a[c.value].title + "</em>");
                h.each(function() {
                    var n = b(this);
                    n.text(a[c.value][n.data("put-value")])
                });
                r.attr("href", a[c.value][r.data("put-href")])
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
            })
        };
        g.length && b.getJSON("json/vps-plans.json", c).done(function() {
            t = g.find(".vps-pricing--items");
            u = g.find(".vps-pricing--tag");
            u.css("height", t.height());
            d.on("resize", function() {
                u.css("height", t.height())
            })
        });
        a = b('[data-counter-up="true"]');
        a.length && a.counterUp({
            delay: 10,
            time: 1E3
        });
        b("[data-counter-down]").each(function() {
            var a = b(this);
            a.countdown(a.data("counter-down"), function(a) {
                b(this).html(a.strftime("%D Days %H:%M:%S"))
            })
        });
        b('[data-animate-scroll="true"]').on("click", function(a) {
            a.preventDefault();
            a = b(this).attr("href");
            "undefined" === typeof b(this).data("offset") || b(this).data("offset");
            b(a).animatescroll({
                padding: 65,
                easing: "easeInOutExpo",
                scrollSpeed: 2E3
            })
        });
        var m = b(".gallery--items"),
            a = b(".gallery--filter-menu");
        m.length && (m.isotope({
            animationEngine: "best-available",
            itemSelector: ".gallery--item"
        }), a.on("click", "a", function() {
            var a = b(this),
                c = a.attr("href");
            m.isotope({
                filter: "*" !== c ? '[data-cat~="' + c + '"]' : c
            });
            a.parent("li").addClass("active").siblings().removeClass("active");
            return !1
        }), m.magnificPopup({
            delegate: ".gallery--img a",
            type: "image",
            gallery: {
                enabled: !0,
                navigateByImgClick: !1
            },
            zoom: {
                enabled: !0
            },
            callbacks: {
                open: function() {
                    this.currItem.el.addClass("active")
                },
                close: function() {
                    this.currItem.el.removeClass("active")
                }
            }
        }));
        var f = b("#map");
        f.length && function() {
            var a = new google.maps.Map(f[0], {
                center: {
                    lat: f.data("map-latitude"),
                    lng: f.data("map-longitude")
                },
                zoom: f.data("map-zoom"),
                scrollwheel: !1,
                disableDefaultUI: !0,
                zoomControl: !0
            });
            if ("undefined" !== typeof f.data("map-marker")) {
                var b =
                    f.data("map-marker"),
                    c = 0;
                for (c; c < b.length; c++) new google.maps.Marker({
                    position: {
                        lat: b[c][0],
                        lng: b[c][1]
                    },
                    map: a,
                    animation: google.maps.Animation.DROP,
                    draggable: !0
                })
            }
        }();
        var v = b('[data-has-pricing-head="no"]'),
            a = function() {
                v.children(".pricing--content").css("margin-top", v.siblings().find(".pt-head").outerHeight())
            };
        v.length && (a(), d.on("resize", a));
        a = b("#domainPricing");
        p = b("#dedicatedPricing");
        a.add(p).find("table td").each(function() {
            var a = b(this);
            a.prepend('<span class="labelText">' + a.data("label") +
                "</span>")
        });
        
       
    function initBannerSlider() {
        var a = b(".banner-slider");
        if (a.length && !a.data("owlCarousel")) {
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

    // Init on DOM ready
    initBannerSlider();
    });

    // Also init on window load
    d.on("load", function() {
        initBannerSlider();
    }).on("load scroll", function() {
        1 < d.scrollTop() ? k.addClass("scrolling") : k.removeClass("scrolling");
    });
})(jQuery);

