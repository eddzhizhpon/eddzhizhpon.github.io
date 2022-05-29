$("body").on('click', 'a', function () {
    $("div").addClass('fade').one('animationend', function() {
         $(this).removeClass('fade');
    });
 })