/* Basic Widget Functions */


/* Flip
----------------------------------------------------------------------------------- */


	function flip() {
	
		$('h1').hover(function() {
		
			$('#info').fadeIn();
		
		}, function() {
		
			$('#info').fadeOut();

		});

		var gInfoButton;

		gInfoButton = new AppleInfoButton(document.getElementById("info"), document.getElementById("front"), "black", "black", showPrefs);

	}

	function showPrefs() {
		
		var front = document.getElementById("front");
		var back = document.getElementById("back");
	
		if (window.widget) widget.prepareForTransition("ToBack");
	
		front.style.display="none";
		back.style.display="block";
	
		if (window.widget) setTimeout ('widget.performTransition();', 0);
	
	}

	function hidePrefs() {
	
		if ($('input[name="email"]').val().length > 0 && $('input[name="password"]').val().length > 0) {
		
			if (!signed_in || $('input[name="email"]').val() != email || $('input[name="password"]').val() != password) {
				
				savePreferences();
				readPreferences();
				login(true);
		
			}
		
			var front = document.getElementById("front");
			var back = document.getElementById("back");
		
			if (window.widget) widget.prepareForTransition("ToFront");
		
			back.style.display="none";
			front.style.display="block";
		
			if (window.widget) setTimeout('widget.performTransition();', 0);
		
		}
	
	}
	
	
/* Get URL
----------------------------------------------------------------------------------- */


	function getUrl() {
	
		if (window.widget) {
		
			var url = $(this).attr('href');
			widget.openURL(url);
			return false;
		
		}
	
	}
	
	
/* Window Resize
----------------------------------------------------------------------------------- */

	
	var growboxInset;
	
	function mouseDown(event) {
	
		document.addEventListener('mousemove', mouseMove, true);
		document.addEventListener('mouseup', mouseUp, true);
	
		growboxInset = {x:(window.outerWidth - event.x), y:(window.outerHeight - event.y)};
	
		event.stopPropagation();
		event.preventDefault();
	
	}
	
	function mouseMove(event) {
	
		var x = event.x + growboxInset.x;
		var y = event.y + growboxInset.y;
	
		if (x < 300) x = 300;
		if (y < 300) y = 300;
	
		window.resizeTo(x, y);
		size();

		event.stopPropagation();
		event.preventDefault();
	
	}
	
	function mouseUp(event) {
	
		document.removeEventListener('mousemove', mouseMove, true);
		document.removeEventListener('mouseup', mouseUp, true);
	
		event.stopPropagation();
		event.preventDefault();
		
		savePreferences();
	
	}
	
	
/* Preferences
----------------------------------------------------------------------------------- */


	function savePref(key, value) {
	
		if (window.widget) {
		
			widget.setPreferenceForKey(value, makeKey(key));
			
		} else {
		
			$.cookie(makeKey(key), value);
			
		}
	
	}
	
	function readPref(key) {
	
		if (window.widget) {
		
			return widget.preferenceForKey(makeKey(key));
			
		} else {
		
			return $.cookie(makeKey(key));
					
		}
	
	}
	

/* Save Preferences */


	function savePreferences() {
				
		savePref('email', $('input[name="email"]').val());
		savePref('password', $('input[name="password"]').val());
		savePref('width', $(window).width());
		savePref('height', $(window).height());
		
	}
	
	
/* Read Preferences */

	
	function readPreferences() {
		
		// Global variables
		email = readPref('email');
		password = readPref('password');
		
		log(email);
		
		// Local variables
		var bookmark = readPref('bookmark');
		var width = readPref('width');
		var height = readPref('height');
		var hiddenAd = readPref('hiddenAd');
		
		// Populate login information
		$('input[name="email"]').val(email);
		$('input[name="password"]').val(password);
		
		// Resize widget
		window.resizeTo(width, height);
		size();
		
		// Fix "+" bug
		email = $('input[name="email"]').val().replace('+', '%2B');

	}
	

/* Make Key */


	function makeKey(key) {
	
		if (window.widget) {
				
			return (widget.identifier + "-" + key);
			
		} else {

			return "dashnote-" + key;
		
		}

	}	
			
	