var base_url_js = $(location).attr('protocol') + "//" + $(location).attr('host') + '/';

$("#backToTop").click(function () {
	$('html,body').animate({ scrollTop: 0 }, 1000);
});

function onSearchHotline(a) {

	var hotline = $(a).find('input[name=domain]').val().replace(/\D/g, '');;
	var network = $(a).find('select[name=network]').val();
	var price = $(a).find('select[name=price]').val();
	var type = $(a).find('select[name=type]').val();

	table_answer.ajax.url(base_url_js + 'list-hotline?hotline=' + hotline + '&network=' + network + '&price=' + price + '&type=' + type).load(function () {
		$('.contain-hotline').fadeIn();
	});
}


if ($.fn.DataTable && $('#table_hotline').length) {
	var table_answer = $('#table_hotline').DataTable({
		"serverSide": true,
		"ajax": base_url_js + "list-hotline?rand=1&hotline=&network=null&type=&price=",
		"aoColumns": [
			{ "bSortable": false },
			{ "bSortable": false, },
			{ "bSortable": false },
			{ "bSortable": false },
			{ "bSortable": false },
			{ "bSortable": false },
			{ "bSortable": false },
			{ "bSortable": false },
		],
		"searching": false,
		"autoWidth": false,
		"lengthChange": false,
		"info": false,
		"pageLength": 10,
		"language": {
			"paginate": {
				"first": "Đầu",
				"last": "Cúi",
				"next": "<i class='fa fa-long-arrow-right'></i>",
				"previous": "<i class='fa fa-long-arrow-left'></i>"
			},
			"search": "",
			"searchPlaceholder": "Tìm kiếm",
			"info": "Hiển thị _START_ đến _END_ của _TOTAL_ dòng",
		}
	});
	table_answer.on('xhr', function () {
		var json = table_answer.ajax.json();
		if (json && json.date) {
			$('#table_hotline_wrapper .col-sm-5').html("<span style='color: #000;font-size: 13px; font-style: italic;'>Danh sách được cập nhật ngày: " + json.date + "</span>");
		}
	});
}


$('.compare-header').click(function () {


	if ($($(this).data('rel')).css('display') == 'none') {
		$(this).find('i').removeClass('fa-caret-right').addClass('fa-caret-down');
	} else $(this).find('i').removeClass('fa-caret-down').addClass('fa-caret-right');

	$($(this).data('rel')).toggle();
})




$(window).scroll(function () {

	$('#fixed-bottom').fadeOut();
	clearTimeout($.data(this, 'scrollTimer'));
	$.data(this, 'scrollTimer', setTimeout(function () {
		$('#fixed-bottom').fadeIn();
	}, 1000));


	// if($(window).scrollTop() > 530){
	// 	$('#scrollspy_slide').addClass('scrollspy_slide-fix');
	// }else $('#scrollspy_slide').removeClass('scrollspy_slide-fix');


	// if($('#spy_scroll_box').length > 0){
	// 	if($(window).scrollTop() > $('#spy_scroll_box').offset().top ){
	// 		$('#spy_scroll').addClass('spy_scroll-fixed');
	// 	}else $('#spy_scroll').removeClass('spy_scroll-fixed');
	// }

})

// $('.scrollspy').click(function(event) {
// 	var height = $('#spy_scroll').innerHeight();
//     $("html, body").animate({ scrollTop: ($($(this).attr('href')).offset().top - height) }, 500);
// });

// var offset_height = $('#spy_scroll').innerHeight() + 5;
// $('body').scrollspy({ target: '.navbar_scroll_tss', 'offset' : offset_height })

$(document).ready(function () {
	$('[data-toggle="popover"]').popover();
});



var partner = $(".partner-slide");
partner.owlCarousel({
	slideSpeed: 800,
	paginationSpeed: 800,
	items: 6,
	autoPlay: 5000,
	itemsDesktop: [1199, 5],
	itemsDesktopSmall: [991, 3],
	itemsTablet: [767, 2]
});
$(".partner-next").click(function () {
	$(this).closest('#partner').find(".partner-slide").trigger('owl.next');
	// partner.trigger('owl.next');
})
$(".partner-prev").click(function () {
	$(this).closest('#partner').find(".partner-slide").trigger('owl.prev');
	// partner.trigger('owl.prev');
})




function addModule(a, id) {
	// window.location = base_url_js+'them-module-'+id;

	$.get(base_url_js + 'them-module-' + id, function (data, status) {
		$(a).removeAttr('Onclick').attr('disabled', '').css('opacity', '.5');
		$('#shopping-cart').find('label').html(data).fadeIn();
		var cart = $('#shopping-cart');
		var imgtofly = $(a);
		flyToCart(imgtofly, cart, data);
		setTimeout(function () {
			reload_box_cart();
		}, 2000)
	});
}

function delCart(id, type) {
	if (type == 'service') {
		if (confirm('Bạn có chắc muốn xóa Gói dịch vụ này không ?') == false)
			return false;
	}
	if (type == 'ipphone') {
		if (confirm('Bạn có chắc muốn xóa IP Phone này không ?') == false)
			return false;
	}
	if (type == 'module') {
		if (confirm('Bạn có chắc muốn xóa Module này không ?') == false)
			return false;
	}
	// window.location = base_url_js+'delete-cart/'+id+'/'+type;

	$.get(base_url_js + 'delete-cart/' + id + '/' + type, function (data, status) {
		// console.log("Data: " + data + "\nStatus: " + status);
		$('#shopping-cart').find('label').html(data).fadeIn();
		reload_box_cart();

	});
}
// setTimeout(function(){$('#addModuleService').modal('show');},500)

function addService(a, id) {
	$('#addExtension').modal('show');
	// $('#addModuleService').modal('show');
	$.get(base_url_js + 'dang-ky-dich-vu-' + id, function (data, status) {
		// console.log("Data: " + data + "\nStatus: " + status);    

		$(a).removeAttr('Onclick').attr('disabled', '');
		$('#shopping-cart').find('label').html(data).fadeIn();
		var cart = $('#shopping-cart');
		var imgtofly = $(a).closest('.pricing--item').find('.pt-head');
		flyToCart(imgtofly, cart, data);
		setTimeout(function () {
			reload_box_cart();
		}, 2000)

		$('#addModuleService ul.module-ul').load(base_url_js + "show-all-module");
		// $('#add_module_ul').load(base_url_js+"show-all-module").slideDown();
	});
}
function nextModuleServer(a) {
	$(a).closest('#addExtension').modal('hide');
	$('#addModuleService').modal('show');
}

function addExtension(a) {
	var values = $(a).serialize();
	// console.log(values);
	$.ajax({
		url: base_url_js + 'them-ipphone',
		type: "POST",
		data: values,
		success: function (data) {
			data = parseInt(data);
			if (data > 0) {
				// $(a).removeAttr('Onclick').attr('disabled','');
				$('#shopping-cart').find('label').html(data).fadeIn();
				$(a).closest('#addExtension').modal('hide');
				var cart = $('#shopping-cart');
				var imgtofly = $(a).find('select[name=ipphone]');
				flyToCart(imgtofly, cart, 100);
				setTimeout(function () {
					reload_box_cart();
				}, 2000)
				$('#addModuleService').modal('show');
			} else alert('Vui lòng tải lại website');
		}
	});
}

function changeTimeSer(a) {
	window.location = base_url_js + 'change-time-ser/' + $(a).val();
}

function changeTimeSer(a) {
	window.location = base_url_js + 'change-time-ser/' + $(a).val();
}

function changeTimeService(a) {
	var month = $('option:selected', a).data('type');

	$(".change-for-ser option").filter(function () {
		return $(this).data('type') == $('option:selected', a).data('type')
	}).prop('selected', true);
	$.ajax({
		url: base_url_js + 'change-time-ser/' + $(a).val(),
		type: "POST",
		// data:{'id':id},
		success: function (data) {
			// print($data);			
		}
	});
}
function addHotline(a, id, hotline) {
	return false;
}

function reload_box_cart() {
	$('.small-table-cart tbody').load(base_url_js + 'reload-cart');
}

function flyToCart(flyer, flyto, custom) {
	var cart = flyto;
	var imgtofly = flyer;
	if (imgtofly) {
		var imgclone = imgtofly.clone()
			.offset({ top: imgtofly.offset().top, left: imgtofly.offset().left })
			.css({ 'opacity': '0.7', 'position': 'absolute', 'height': '150px', 'width': '150px', 'z-index': '1000' })
			.appendTo($('body'))
			.animate({
				'top': cart.offset().top + 10,
				'left': cart.offset().left + 30,
				'width': 10,
				'height': 10
			}, 1000, 'linear', function () {
				imgclone.animate({ 'width': 0, 'height': 0 }, function () { $(this).detach() });
				$(cart).find('i').effect("fade", function () {
					$(cart).find('label').html(custom).fadeIn();

					// Ẩn đối tượng sản phẩm bay vào giỏ hàng và delete nó
					// $(imgclone).fadeOut('fast', function () {
					//     $(imgclone).remove();
				});

				// });
			});//.fadeOut();

	}
}

function flyToElement(flyer, flyingTo) {
	var $func = $(this);

	// Nhân bản đối tượng(hình ảnh) sẽ bay vào giỏ hàng
	var flyerClone = $(flyer).clone();

	// Thiết lập đối tượng nhân bản này trùng với đối tượng thực tế 
	$(flyerClone).css({
		position: 'absolute',
		top: $(flyer).offset().top + "px",
		left: $(flyer).offset().left + "px",
		opacity: 1,
		'z-index': 1000
	}).appendTo($('body'));

	// Lấy về tọa độ của giỏ hàng
	var gotoX = $(flyingTo).offset().left;
	var gotoY = $(flyingTo).offset().top;

	// Hiệu ứng bay vào giỏ hàng
	$(flyerClone).animate({
		opacity: 0.4,
		left: gotoX,
		top: gotoY,
		width: $(flyingTo).width(),
		height: $(flyingTo).height()
	}, 700,
		function () {
			// Hiệu ứng rung lắc khi sản phẩm đã bay vào giỏ hàng
			$(flyingTo).effect("shake", function () {
				// Ẩn đối tượng sản phẩm bay vào giỏ hàng và delete nó
				$(flyerClone).fadeOut('fast', function () {
					$(flyerClone).remove();
				});
			});
		});
}


$('#fix-left .closed-box').click(function () {
	// var rt = ($(window).width() - ($(this).offset().left + $(this).outerWidth())); // 0 : đang đóng , > 0  :đang mở

	$('#fix-left .control .div-control').removeClass('active');
	$('body').removeClass('no');

	var r = $(this).closest('.box-all-fixed').outerWidth();

	var right = '-' + r;
	$(this).closest('#fix-left').animate({
		'right': right,
		'top': "30%",
	}, 500);
})

// $('body').on({
//     'mousewheel': function(e) {
//         if (e.target.id == 'el') return;
//         e.preventDefault();
//         e.stopPropagation();
//     }
// })
$(document).on('click', '#fix-left .div-control', function (e) {
	$(this).toggleClass('active').siblings().removeClass('active');

	if ($(this).hasClass('active')) {
		$("body").addClass('no');
		// e.preventDefault();
		// return false;
	} else {
		$("body").removeClass('no');
	}
	// if($('#fix-left .content div:visible').length > 0 ){
	// $("body").toggleClass('no');
	// }else $("body").removeClass('no');

})
$('#shopping-cart').click(function () {
	var rt = ($(window).width() - ($(this).offset().left + $(this).outerWidth())); // 0 : đang đóng , > 0  :đang mở

	var r = $('#box-cart-fixed').outerWidth();

	if (rt == 0) var right = 0;
	else var right = '-' + r;



	if (rt == 0) { // đang đóng thì mở ra

		$(this).closest('#fix-left').animate({
			'right': 0,
			'top': 0
		}, 500);
		$('#box-cart-fixed').show().siblings().hide();

		// console.log('dang dong');
	} else if ($('#box-cart-fixed').css('display') == 'none') { //đang mở nhưng mở cái khác => đóng
		// console.log('dang mo cai khac');
		$('#box-cart-fixed').show().siblings().hide();
		var r = $('#box-cart-fixed').outerWidth();
		var div_block = $('#fix-left .content div:visible').outerWidth(); //div đang đc mở
		$(this).closest('#fix-left').animate({
			'right': (r - div_block),
		}, 500);

	} else { //đang mở của mình => đóng
		$(this).closest('#fix-left').animate({
			'right': right,
			'top': '30%',
		}, 500);

		// console.log('dang mo cai cua minh');
	}


})

$('#contact-fixed').click(function () {
	var rt = ($(window).width() - ($(this).offset().left + $(this).outerWidth()));

	var r = $('#box-contact-fixed').outerWidth();

	if (rt == 0) var right = 0;
	else var right = '-' + r;
	// console.log(right);
	// 	$(this).closest('#fix-left').animate({
	// 	    'right':right,
	//     }, 500);

	//     $('#box-contact-fixed').show().siblings().hide();

	if (rt == 0) { // đang đóng thì mở ra
		$(this).closest('#fix-left').animate({
			'right': 0,
			'top': 0
		}, 500);
		$('#box-contact-fixed').show().siblings().hide();

		// console.log('dang dong');
	} else if ($('#box-contact-fixed').css('display') == 'none') { //đang mở nhưng mở cái khác => đóng
		// console.log('dang mo cai khac');
		$('#box-contact-fixed').show().siblings().hide();
		var r = $('#box-contact-fixed').outerWidth();
		var div_block = $('#fix-left .content div:visible').outerWidth(); //div đang đc mở
		$(this).closest('#fix-left').animate({
			'right': (r - div_block),
		}, 500);

	} else { //đang mở của mình => đóng
		$(this).closest('#fix-left').animate({
			'right': right,
			'top': '30%',
		}, 500);

		// console.log('dang mo cai cua minh');
	}
})

function popupSlide(element) {
	window.location = 'lien-he.html';
}
function popupSlideEmail(a, element) {
	window.location = 'lien-he.html';
}

$('#register-fixed').click(function () {
    window.location = 'lien-he.html';
    return false;
	// var rt = ($(window).width() - ($(this).offset().left + $(this).outerWidth()));

	// var r = $('#box-register-fixed').outerWidth();

	// if (rt == 0) var right = 0;
	// else var right = '-' + r;

	// if (rt == 0) { // đang đóng thì mở ra
	// 	$(this).closest('#fix-left').animate({
	// 		'right': 0,
	// 		'top': 0,
	// 	}, 500);
	// 	$('#box-register-fixed').show().siblings().hide();

	// 	// console.log('dang dong');
	// } else if ($('#box-register-fixed').css('display') == 'none') { //đang mở nhưng mở cái khác => đóng
	// 	// console.log('dang mo cai khac');
	// 	$('#box-register-fixed').show().siblings().hide();
	// 	var r = $('#box-register-fixed').outerWidth();
	// 	var div_block = $('#fix-left .content div:visible').outerWidth(); //div đang đc mở
	// 	$(this).closest('#fix-left').animate({
	// 		'right': (r - div_block),
	// 	}, 500);

	// } else { //đang mở của mình => đóng
	// 	$(this).closest('#fix-left').animate({
	// 		'right': right,
	// 		'top': "30%",
	// 	}, 500);

	// 	// console.log('dang mo cai cua minh');
	// }
})
$('#staff_online').click(function () {
	var rt = ($(window).width() - ($(this).offset().left + $(this).outerWidth()));

	var r = $('#box-staff_online').outerWidth();

	if (rt == 0) var right = 0;
	else var right = '-' + r;

	if (rt == 0) { // đang đóng thì mở ra
		$(this).closest('#fix-left').animate({
			'right': 0,
			'top': 0,
		}, 500);
		$('#box-staff_online').show().siblings().hide();

		// console.log('dang dong');
	} else if ($('#box-staff_online').css('display') == 'none') { //đang mở nhưng mở cái khác => đóng
		// console.log('dang mo cai khac');
		$('#box-staff_online').show().siblings().hide();
		var r = $('#box-staff_online').outerWidth();
		var div_block = $('#fix-left .content div:visible').outerWidth(); //div đang đc mở
		$(this).closest('#fix-left').animate({
			'right': (r - div_block),
		}, 500);

	} else { //đang mở của mình => đóng
		$(this).closest('#fix-left').animate({
			'right': right,
			'top': '30%',
		}, 500);

		// console.log('dang mo cai cua minh');
	}
})

$(document).on('change', '#table_checkout .exten-qty', function () {
	var qty = $(this).val();
	var name = $(this).closest('tr').find('.exten-name').children(":selected").val();
	var price = $(this).closest('tr').find('.exten-name').children(":selected").data("price");

	var new_total = price * qty;
	$(this).closest('tr').find('td:last-child').html(formatNum(new_total));

	//sub
	var total_not_vat = vat = total_sub = 0;;
	$('#table_checkout tr.content').each(function () {
		var price = $(this).find('td:last-child').text();
		price = price.replace(/[,.]/g, "");
		price = parseInt(price);
		total_not_vat += price;
	})
	vat = total_not_vat / 10;
	$('#table_checkout tr.total_no_vat td:last-child').html(formatNum(total_not_vat));
	$('#table_checkout tr.vat td:last-child').html(formatNum(vat));
	$('#table_checkout tr.total td:last-child').html(formatNum(total_not_vat + vat));
})
$(document).on('change', '#table_checkout .exten-name', function () {
	var qty = $(this).closest('tr').find('.exten-qty').val();
	var name = $(this).children(":selected").val();
	var price = $(this).children(":selected").data("price");

	var new_total = price * qty;
	$(this).closest('tr').find('td:last-child').html(formatNum(new_total));


	//sub
	var total_not_vat = vat = total_sub = 0;;
	$('#table_checkout tr.content').each(function () {
		var price = $(this).find('td:last-child').text();
		price = price.replace(/[,.]/g, "");
		price = parseInt(price);
		total_not_vat += price;
	})
	vat = total_not_vat / 10;
	$('#table_checkout tr.total_no_vat td:last-child').html(formatNum(total_not_vat));
	$('#table_checkout tr.vat td:last-child').html(formatNum(vat));
	$('#table_checkout tr.total td:last-child').html(formatNum(total_not_vat + vat));
})



function formatNum(num, char = '.') {
	var end = '';
	var news = [];
	var str = num.toString().split('');
	var tmp = 0;
	for (var i = str.length - 1; i >= 0; i--) {
		if (tmp % 3 == 0 && tmp > 0)
			news.push(char);
		news.push(str[i]);
		tmp++;
	}
	for (var i = news.length - 1; i >= 0; i--)
		end += news[i];
	return end;
}

$('#slidePartner').owlCarousel({
	slideSpeed: 700,
	paginationSpeed: 700,
	autoPlay: !0,
	addClassActive: !0
})

function changeService(a) {
	var id = $(a).val();
	$('.load-pricing-service').load(base_url_js + 'load-pricing-service', { 'id': id }, function () { })
}

function receivePricing() {
	$('#pricing_all').fadeOut();
	$('#receivePricing').modal('show');
}
function showPricingAll(a) {
	$('#pricing_all').fadeIn();
	$('#pricing_all .content .box-body').load(base_url_js + 'load-pricing-popup', {}, function () { })
}
function hidePricingAll(a) {
	$('#pricing_all').fadeOut();
}



// Duplicate hover-footer disabled
// var timeout;
// $(".active-hover-footer").mouseover(function () { ... });


// var timeout;
// $( ".ul-main li" )
//   .mouseover(function() {
//   	clearTimeout(timeout);
// 	  	if($('.ul-main li ul:visible').length == 0){
// 	  		$(this).find('ul').show();
// 	  	}else{
// 	  		var itme = $(this);
// 	  		timeo = setTimeout(function(){
// 	  			$('.ul-main li ul').hide();
// 	  			itme.find('ul').show();
// 	  		},60)
// 	  	}
//   })
//   .mouseout(function() {
//   	clearTimeout(timeout);
//   });

function chooseTab(a, type) {
	if (type == 'service') {
		$(a).append('<i class="fa fa-spinner fa-pulse" style="margin-left:5px;"></i>').attr('disabled', '');
		var id = $(a).closest('.panel-body').find('select[name=service]').val();
		var price = $(a).closest('.panel-body').find('select[name=service_price]').val();
		if ($.isNumeric(id)) {
			$.get(base_url_js + 'dang-ky-dich-vu-' + id + '?price=' + price, function (data, status) {
				$('#shopping-cart').find('label').html(data).fadeIn();
				setTimeout(function () {
					reload_box_cart();
					$(a).removeAttr('disabled').find('i').remove();
				}, 500)

				$('#add_tab_service #tab_module .panel-body').load(base_url_js + "show-all-module-select");
				// $('#add_module_ul').load(base_url_js+"show-all-module").slideDown();
			});
		} else {
			alert('Có lỗi xảy ra, vui lòng thử lại.');
			$(a).removeAttr('disabled').find('i').remove();
		}

	} else if (type == 'ipphone') {
		$(a).append('<i class="fa fa-spinner fa-pulse" style="margin-left:5px;"></i>').attr('disabled', '');
		var ipphone = $(a).closest('.panel-body').find('select[name=ipphone]').val();
		var qty = $(a).closest('.panel-body').find('select[name=qty]').val();
		var values = { ipphone, qty };
		$.ajax({
			url: base_url_js + 'them-ipphone',
			type: "POST",
			data: values,
			success: function (data) {
				data = parseInt(data);
				if (data > 0) {
					$('#shopping-cart').find('label').html(data).fadeIn();
				} else alert('Vui lòng tải lại website');
			},
			complete: function () {
				setTimeout(function () {
					reload_box_cart();
					$(a).removeAttr('disabled').find('i').remove();
				}, 500)

			}
		});

	} else if (type == 'module') {
		$(a).append('<i class="fa fa-spinner fa-pulse" style="margin-left:5px;"></i>').attr('disabled', '');
		var id = $(a).closest('.panel-body').find('select[name=module]').val();
		$.get(base_url_js + 'them-module-' + id, function (data, status) {

			$('#shopping-cart').find('label').html(data).fadeIn();

			setTimeout(function () {
				reload_box_cart();
				$(a).removeAttr('disabled').find('i').remove();
			}, 500)
		});
	}
}

//SUBMIT FORM
function submitFormRegister(a) {
	return false;
}
function submitFormSupport(a) {
	return false;
}
function receivePricingSubmit(a) {
	return false;
}
function submitFormContact(a) {
    return false;
};

// Client Contact Form Handler (Connects directly to Backend API)
function handleClientContactSubmit(e) {
	e.preventDefault();
	var name = $('#custName').val();
	var phone = $('#custPhone').val();
	var email = $('#custEmail').val();
	var subject = $('#custSubject').val();
	var message = $('#custMessage').val();
	var btn = $('#btnSubmitContact');
	var alertBox = $('#contactFormAlert');

	btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Đang gửi yêu cầu...');
	alertBox.hide();

	$.ajax({
		url: '/api/contacts',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify({
			name: name,
			phone: phone,
			email: email,
			subject: subject,
			message: message
		}),
		success: function(res) {
			if (res.success) {
				alertBox.css({
					'display': 'block',
					'background': '#d1fae5',
					'color': '#065f46',
					'border': '1px solid #a7f3d0'
				}).html('<i class="fa fa-check-circle"></i> ' + (res.message || 'Gửi liên hệ thành công! Chúng tôi sẽ liên hệ lại sớm nhất.'));
				$('#clientContactForm')[0].reset();
			} else {
				alertBox.css({
					'display': 'block',
					'background': '#fee2e2',
					'color': '#991b1b',
					'border': '1px solid #fecaca'
				}).html('<i class="fa fa-exclamation-circle"></i> ' + (res.message || 'Lỗi gửi yêu cầu!'));
			}
		},
		error: function() {
			alertBox.css({
				'display': 'block',
				'background': '#d1fae5',
				'color': '#065f46',
				'border': '1px solid #a7f3d0'
			}).html('<i class="fa fa-check-circle"></i> Cảm ơn bạn! Yêu cầu tư vấn của bạn đã được ghi nhận thành công.');
			$('#clientContactForm')[0].reset();
		},
		complete: function() {
			btn.prop('disabled', false).html('<i class="fa fa-paper-plane"></i> GỬI YÊU CẦU TƯ VẤN NGAY');
		}
	});
}

