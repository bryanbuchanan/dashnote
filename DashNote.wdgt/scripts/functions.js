/* Javascript Functions */


	app_name = "DashNote";
	version = 14;
	userAgent = app_name + "/" + version;
	
	var api = new Object();
	api.app_id = "chalk-bump-f49";
	api.key = "aa320ad0aa9f44ad89be7b57636ebfe2";
	api.token = "";
	api.url = "https://auth.simperium.com/1/" + api.app_id + "/authorize/";

	autosave_delay = 2; // Seconds
	debug = false;


/* Form Submit
----------------------------------------------------------------------------------- */


	function submit() {
	
		$('input').keypress(function(event) {
		
			if (event.which == 13) hidePrefs();
		
		});
	
	}

	
/* Debugging log
----------------------------------------------------------------------------------- */


	function log(message) {
	
		if (debug) console.log(message);
	
	}


/* Disable Elements
----------------------------------------------------------------------- */


	function disable(disable, elements) {
	
		if (disable) {
		
			$(elements).addClass('disabled');
		
		} else if (elements) {
		
			$(elements).removeClass('disabled');
		
		} else {
		
			$('.disabled').removeClass('disabled');
		
		}
	
	}


/* Login
----------------------------------------------------------------------- */


	function login(reset) {
		
		// Slide UI left to show notes list
		slideLeft();
		
		// Set loading status to true
		loading(true);
		
		// Disable buttons while notes load
		disable(true, 'ul.actions .refresh, ul.actions .new');

		// Check if login information changed
		if (typeof email != "undefined" && email != "" && email != null && typeof password != "undefined" && password != "" && password != null) {
								
			// Remove any existing notes		
			$('ul.notes li').remove();
									
			$.ajax({
			
				url: api.url,
				type: 'POST',
				contentType: 'application/json',
				dataType: 'json',
				
				data: JSON.stringify({
					username: email.replace('%2B', '+'),
					password: password
				}),
				
				beforeSend: function(xhr) {
				
					xhr.setRequestHeader('X-Simperium-API-Key', api.key);
					xhr.setRequestHeader('User-Agent', userAgent);
			
				}, success: function(data) {
			
					api.token = data.access_token;
					signed_in = true;
					widgetUpdate(email);
					
					start();
					
				}, error: function() {
				
					log('authentication failure');
				
					// Flip back to preferences
					setTimeout(showPrefs, 700);
					
					// Change state
					signed_in = false;
					offline(false);
					log('Wrong email or password');
					
				}, complete: function(XMLHttpRequest, textStatus) {
				
					// No connection error
					if (XMLHttpRequest.status == 0) {
						
						offline(true);
						log('No internet connection');
						
					}
					
				}
								
			});

		} else {
		
			// Show preferences again if no login info was provided
			setTimeout(showPrefs, 700);
		
		}
		
		// Reset search
		if (reset) clearSearch();
	
	}
	
	
/* Start Simperium Syncing
----------------------------------------------------------------------------------- */
	
	
	function start() {
	
		var simperium = new Simperium(api.app_id, { token: api.token });
		bucket = simperium.bucket('note');
		
		bucket.on('ready', function() {
		
			log('ready');
			loading(false);
			disable(false);
			
		});
		
		bucket.on('get', function(id, data) {
		
			log('get');
			log("id: " + id);
			log(data);
			
		});
		
		// Get Remote Data
		bucket.on('notify', function(id, data) {
		
			log('notify');
			// log(data);
				
			if ($('#' + id).length > 0 && data.deleted) {
			
				// Erase note
				$('#' + id).remove();
				notesTally();

			} else if (!data.deleted && typeof data.content != "undefined") {

				if ($('#' + id).length > 0) {
				
					log('Updating an existing note');

					// Get List Item Content
					var preview = getPreview(data.content);

					// Update List Item
					var $listItem = $('#' + id);
					$listItem.find('strong').text(preview.title);
					$listItem.find('span').text(preview.preview);
					$listItem.find('.note').text(data.content);

					// Update metadata
					saveData($listItem, 'creationDate', data.creationDate);
					saveData($listItem, 'deleted', data.deleted);
					saveData($listItem, 'modificationDate', data.modificationDate);
					saveData($listItem, 'publishURL', data.publishURL);
					saveData($listItem, 'shareURL', data.shareURL);
					saveData($listItem, 'systemTags', data.systemTags);
					saveData($listItem, 'tags', data.tags);
					
					// System tags
					if (isPinned(data.systemTags)) {
						pinUI(id, true);
					} else {
						pinUI(id, false);
						log('turning off pin');
					}
					
					if (isShared(data.systemTags)) {
						$listItem.addClass('shared');
					} else {
						$listItem.removeClass('shared');
					}
					
					// Move to top of list
					$listItem.appendTo($listItem.parent());
					// toTop(id);
					
					// Update textarea if the note is open
					if ($listItem.hasClass('selected')) $('textarea').val(data.content);
				
				} else {
	
					log('Adding a new note to the list');
					newListItem(id, data);

				}
				
				sort();
				notesTally();
				
			}
						
		});
		
		// Local change made
		bucket.on('local', function(id) {
		
			log('local id: ' + id);

			// Make sure note exists already
			if ($('#' + id).length > 0 && $('#' + id).hasClass('deleted')) {
			
				// Get metadata
				var data = readData($('#' + id));
				
				log(data);
				
				// Erase Note
				$('#' + id).remove();
				notesTally();

				return data;
			
			} else if ($('#' + id).length > 0) {
						
				// Get metadata
				var data = readData($('#' + id));
				
				log(data);
				
				return data;
			
			}
			
		});
		
		// Error
		bucket.on('error', function(errortype) {
			log("got error for bucket: "+errortype);
			if (errortype == "auth") {
				log("auth error, need to reauthenticate and get new access token")
			}
		});		
		
		bucket.start();
	
	}
	
	
/* Create New List Item
----------------------------------------------------------------------------------- */
	
	
	function newListItem(id, data) {
	
		// Get List Item Content
		var preview = getPreview(data.content);
		
		// Add list item
		var template = $('<li id="' + id + '"><a href="#"><strong></strong><span><span></a><div class="note"></div></li>');
		$('ul.notes').append(template);
		var $note = $('#' + id);
		$note.find('strong').text(preview.title);
		$note.find('span').text(preview.preview);
		$note.find('.note').text(data.content);

		// Add metadata
		saveData($note, 'creationDate', data.creationDate);
		saveData($note, 'deleted', data.deleted);
		saveData($note, 'modificationDate', data.modificationDate);
		saveData($note, 'publishURL', data.publishURL);
		saveData($note, 'shareURL', data.shareURL);
		saveData($note, 'systemTags', data.systemTags);
		saveData($note, 'tags', data.tags);
		
		// Pinned
		if (isPinned(data.systemTags)) {
			pinUI(id, true);
		} else {
			pinUI(id, false);
		}

		// Shared		
		if (isShared(data.systemTags)) {
			$note.addClass('shared');
		} else {
			$note.removeClass('shared');
		}
			
	}
	
	
/* View Note
----------------------------------------------------------------------------------- */


	function viewNote() {
		
		// Swap selected class
		$('ul.notes .selected').removeClass('selected');
		$(this).parent().addClass('selected');
	
		// Populate content
		var id = $(this).parent().attr('id');
		var content = $(this).siblings('div').text();
		$('#textarea').val(content);
		
		// Body classes
		$('body').addClass('note');
		$('body').removeClass('single_column');
		
		// Pinned
		var systemTags = $(this).parent().data('systemTags');
		if (isPinned(systemTags)) pinUI(id, true);
		
		// Focus
		setTimeout(function() { $('#textarea').focus(); }, 200);
		
		status('');
				
		return false;
	
	}
	
	
/* New Note
----------------------------------------------------------------------------------- */


	function newNote() {
			
		if (!$(this).parent().hasClass('disabled')) {
		
			// Empty textarea
			$('#textarea').val('');
			
			// Clear search
			clearSearch();
			
			$('body').addClass('note new');
			$('body').removeClass('single_column');

			setTimeout(function() {

				// Get data
				var id = uuid();
				var time = currentTime();

				// Create new list item
				newListItem(id, {
				
					content: '',
					creationDate: time,
					deleted: false,
					modificationDate: time,
					publishURL: '',
					shareURL: '',
					systemTags: [],
					tags: []

				});
				
				// Move to top of list
				toTop(id);
				
				// Select Current List Item
				$('#' + id).addClass('selected');
				
				// Autofocus textarea
				$('#textarea').focus();
			
			}, 200);
				
			status('');

		}
		
		return false;
	
	}
	
	
/* Encode Special Characters
----------------------------------------------------------------------------------- */
	
	
	function encodeCharacters(string) {
	
		return string.replace(/\+/g, '%2B').replace(/\;/g, '%3B');

	}
	
	
/* Close Note
----------------------------------------------------------------------------------- */


	function done() {
	
		if (!$(this).parent().hasClass('disabled')) {
			
			slideLeft();
			
		}
		
		return false;
	
	}
	
	
/* Update Status Message
----------------------------------------------------------------------------------- */


	function status(message) {
	
		if (!$('#status span').hasClass('permanent')) $('#status span').html(message);
	
	}

	
/* Slide Left
----------------------------------------------------------------------------------- */

	
	function slideLeft() {
		
		if ($('body').hasClass('note')) {
	
			// Status Message
			if ($('#search').val() != "") {
			
				var matches = $('ul.notes').children('li:visible').length;
				
				if (matches == 1) {
					status(matches + ' note found');
				} else {
					status(matches + ' notes found');
				}
				
			} else {
			
				notesTally();

			}
			
			// Control and widget states
			$('ul.actions li').removeAttr('style');
			$('body').removeClass('note').removeClass('new');
			$('ul.actions .selected').removeClass('selected');
			
			// After Animation
			setTimeout(function() { 
			
				$('.notes li').removeClass('selected');
				$('body').addClass('single_column');
				
			}, 300);
			
		}
		
	}
	
	
/* Loading
----------------------------------------------------------------------------------- */



	function loading(show) {
	
		$('#loading').remove();

		if (show) {
		
			$('#front').append('<div id="loading"></div>');
			status('');
			
		}
	
	}
	
	
/* Offline
----------------------------------------------------------------------------------- */


	function offline(show) {

		$('#loading').remove();
		$('body').removeClass('offline');
		$('ul.actions .add, ul.actions .refresh').removeClass('disabled');
	
		if (show) {
		
			$('body').addClass('offline');
			$('#front').append('<div id="loading">Offline</div>');
			$('ul.actions .add').addClass('disabled');
			status('');
		
		}
	
	}


/* Search
----------------------------------------------------------------------------------- */


	function search(event) {
		
		if (window.event.keyCode != 13 && window.event.keyCode != undefined) {
	
			var string = $(this).val().toLowerCase();
			
			if (string != "") {
			
				if (string.match(/^\#/)) {
				
					console.log('searching tags');

					$('ul.notes > li').each(function() {


						var tags = $(this).data('tags');

						log(tags);
							
						if (isTagged(tags, string)) {
						
							$(this).show();
							
						} else {
						
							$(this).hide();
	
						}
					
					});
						
				} else {
	
					// Filter listing
					$('ul.notes > li').each(function() {
		
						if ($(this).children('div').text().toLowerCase().indexOf(string) != -1){
						
							$(this).show();
						
						} else {
						
							$(this).hide();
						
						}
					
					});
					
				}
					
				// Status message
				var matches = $('ul.notes').children('li:visible').length;
				
				if (matches == 1) {
	
					status(matches + ' note found');
					
				} else {
				
					status(matches + ' notes found');
	
				}
				
				// Show clear button
				$(this).siblings('a').show();

				// Ad visibility
				if (string == "dontbotherme") {
				
					if ($('#ad').hasClass('hide')) {
						showAd();
					} else {
						hideAd(true);
					}	

				}
				
			} else {
			
				clearSearch();
				
			}
		
		}
	
	}
	
	function clearSearch() {
	
		$('#search').val('');
		$('.search a.clear').hide();
		$('ul.notes > li').show();
		notesTally();
		$('#search').siblings('a').hide();
	
	}

	function startSearch() {
	
		if (!$('body').hasClass('note') && $('#front:visible').length > 0) $('#search').focus();
	
	}
	
	function chooseNote(event) {

		if (window.event.keyCode == 13) {

			var matches = $('ul.notes').children('li:visible').length;
			if (matches == 1) $('ul.notes > li:visible > a').click();
			status('');
			return false;
		
		}
					
	}
	
	
/* Note Tally
----------------------------------------------------------------------------------- */
	
	
	function notesTally() {
	
		if ($('ul.notes').children().length == 1) {
		
			status($('ul.notes').children().length + ' note');
	
		} else {
		
			status($('ul.notes').children().length + ' notes');

		}
	
	}
	

/* Undo/Redo
----------------------------------------------------------------------------------- */
	
	
	function undo() {
	
		var cmd = false;
		var shift = false;
	
		$('#textarea').keyup(function(event) {
		
			if (event.which == 91 || event.which == 93) cmd = false;
			if (event.which == 16) shift = false;
			
		}).keydown(function(event) {
		
			if (event.which == 91 || event.which == 93) cmd = true;
			if (event.which == 16) shift = true;

			if (event.which == 90 && cmd == true && shift == true) {
			
				document.execCommand('redo', false, null);
				return false;
				
			} else if (event.which == 90 && cmd == true) {
			
				document.execCommand('undo', false, null);
				return false;
				
			}
			
		});

	}
	

/* Size Window
----------------------------------------------------------------------------------- */


	function size() {
		
		var windowHeight = $(window).height();
		var windowWidth = $(window).width();

		var textareaWidth = windowWidth - chromeSize.textarea_x;
		var textareaHeight = windowHeight - chromeSize.textarea_y;
		var notesHeight = windowHeight - chromeSize.notes_y;
		var backWidth = windowWidth - chromeSize.back_x;
		var backHeight = windowHeight - chromeSize.back_y;
		
		$('#textarea').css({
			width: textareaWidth + 'px',
			height: textareaHeight + 'px'
		});
						
		$('ul.notes').css({
			height: notesHeight + 'px'
		});	

		$('#back').css({
			width: backWidth + 'px',
			height: backHeight + 'px'
		});
		
	}
			
	
/* Detect Changes
----------------------------------------------------------------------------------- */

	
	function changes() {
	
		$('textarea').keyup(save);
		$('textarea').change(save);
 
	}
	
	
/* Save Note
----------------------------------------------------------------------------------- */
	
	
	function save() {
	
		// Define Elements
		var content = $(this).val();		
		var $listItem = $('ul.notes .selected');
		var id = $listItem.attr('id');
		
		// Update List Item
		var preview = getPreview(content);			
		$listItem.find('strong').text(preview.title);
		$listItem.find('span').text(preview.preview);
		$listItem.find('div').text(content);
		
		// Update metadata
		saveData($listItem, 'modificationDate', currentTime());			
		
		// Move to top of list
		toTop(id);
		
		// Save Changes Remotely
		if (typeof(autoSave) != "undefined") clearTimeout(autoSave);
		autoSave = setTimeout(function() {
						
			log('saving to simperium');
			
			// Get metadata
			var data = readData($listItem);
			
			// Update bucket	
			bucket.update(id, data);

		}, autosave_delay * 1000);
			
	}
	
	
/* Get Note Preview Strings for List Item
----------------------------------------------------------------------------------- */

	
	function getPreview(content) {

		var title = content.split(/\n/)[0];
		var preview = content.replace(title, '').substring(0, 250);
					
		return {
			title: title,
			preview: preview
		}
	
	}
	
	
/* Generate UUID
----------------------------------------------------------------------------------- */	
	
	
	function uuid() {
	
		var S4 = function() {
		
			return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
	
		};
		
		return (S4()+S4()+S4()+S4()+S4()+S4()+S4()+S4());
	
	}
	
	
/* Get Current Time
----------------------------------------------------------------------------------- */
	
	
	function currentTime() {
	
		var d = new Date();
		var time = d.getTime() / 1000;
		return time;
	
	};
	

/* Meta Data
----------------------------------------------------------------------------------- */
	
	
	function saveData(note, name, value) {
		
		note.data(name, value);
		// note.attr('data-' + name, value);
	
	}
	
	function readData(note) {
		
		return {
		
			content: note.find('.note').text(),
			creationDate: note.data('creationDate'),
			deleted: note.data('deleted'),
			modificationDate: note.data('modificationDate'),
			publishURL: note.data('publishURL'),
			shareURL: note.data('shareURL'),
			systemTags: note.data('systemTags'),
			tags: note.data('tags')
		
		}
	
	}
	
	
/* Sort Notes
----------------------------------------------------------------------------------- */
	
	
	function sort() {

		log('sorting list');

		var mylist = $('ul.notes');
		var listitems = mylist.children('li').get();
		
		listitems.sort(function(a, b) {
			
			var pinnedA = ($(a).hasClass('pinned') ? 60 * 60 * 24 * 365 : 0);
			var pinnedB = ($(b).hasClass('pinned') ? 60 * 60 * 24 * 365 : 0);

			var compA = $(a).data('modificationDate') * 1 + pinnedA;
			var compB = $(b).data('modificationDate') * 1 + pinnedB;
				
			return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
		
		});
		
		$.each(listitems, function(idx, itm) {
		
			mylist.prepend(itm);
			
		});
	
	}	

	
/* System Tags
----------------------------------------------------------------------------------- */

	
	function isPinned(systemTags) {
	
		if (typeof systemTags != "undefined") {
		
			var pinned = (systemTags.indexOf('pinned') != -1 ? true : false );
			return pinned;
		
		} else {
		
			return false;
		
		}
		
	}
	
	function isShared(systemTags) {
	
		if (typeof systemTags != "undefined") {
		
			var shared = (systemTags.indexOf('shared') != -1 ? true : false );
			return shared;
			
		}
	
	}
	
	function isTagged(tags, tag) {
	
		if (typeof tags != "undefined" && typeof tag != "undefined") {
		
			var tag = tag.replace(/^\#/, '');
			var found = (tags.indexOf(tag) != -1 ? true : false );
			console.log(found);
			return found;
		
		}
	
	}	
	
	
/* Pinning
----------------------------------------------------------------------------------- */
	
	
	function pin() {
	
		// Get current note info
		var id = $('ul.notes > .selected').attr('id');
		var systemTags = $('#' + id).data('systemTags');
		
		// Create systemTags object if it doesn't exist
		if (typeof systemTags === "undefined") var systemTags = new Object();

		if (isPinned(systemTags)) {
		
			// Remove pinned from systemTags
			var index = systemTags.indexOf('pinned');
			if (index != -1) systemTags.splice(index, 1);
			
			// Update UI
			pinUI(id, false);
		
		} else {

			// Add pinned tag to system tags
			systemTags.push('pinned');

			// Update UI
			pinUI(id, true);

		}
		
		// Save systemTags locally
		$('#' + id).data('systemTags', systemTags);	
		
		// Save note
		$('textarea').each(save);
		
		return false;
		
	}
	
	function pinUI(id, pinned) {
	
		if (pinned) {
		
			$('.actions .pin').addClass('selected');
			$('#' + id).addClass('pinned');
		
		} else {

			$('.actions .pin').removeClass('selected');
			$('#' + id).removeClass('pinned');
		
		}
		
		sort();
		
	}
	
	
/* Erase Note
----------------------------------------------------------------------------------- */

	
	function erase() {
		
		
/* Erase Button */

		
		$('#front > ul.actions .delete a').click(function() {
		
			$('#delete').addClass('show');
			disable(true, 'ul.actions li');
			return false;

		});
		
		
/* Confirm */

		
		$('#delete .delete a').click(function() {
		
			log('Erasing note');
		
			// Get note ID
			var id = $('ul.notes .selected').attr('id');
		
			// Update bucket	
			bucket.update(id, { deleted: true });		
		
			// Update UI
			$('#' + id).data('deleted', true);
			$('#' + id).addClass('deleted');
			$('#delete').removeClass('show');
			slideLeft();
			disable(false);
			
			return false;
		
		});
		
		
/* Cancel */		
		
		
		$('#delete .cancel a').click(function() {
		
			$('#delete').removeClass('show');
			disable(false);
			return false;
		
		});
	
	}
	
	
/* Move Note to Top
----------------------------------------------------------------------------------- */

	
	function toTop(id) {
	
		if (typeof id != "undefinded") {
		
			var $listItem = $('#' + id);
					
			// Move note to top of list
			if (!$listItem.hasClass('pinned')) {
				log('Moving to top of list, under pinned notes.');
				$listItem.insertBefore('ul.notes > li:not(.pinned,.selected,#' + id + '):first');
			} else {
				log('Moving to top of list, above other pinned notes.');
				$listItem.prependTo('ul.notes');
			}
			
			// Scroll notes list if necessary
			var position = $listItem.position().top;
			var scrollTop = $('ul.notes').scrollTop();
			if (scrollTop > position) $('ul.notes').scrollTop(position);
			
		} else { log('Cant move to top, key isnt defined'); }
			
	}
	
	
/* Ad
----------------------------------------------------------------------------------- */
	
	
	function ad() {

		try {
					
			$.ajax({
			
				url: 'http://dashnote.resen.co/ad2',
				dataType: 'jsonp'
								
			});			

		} catch(error) { log('Ad wasn\'t loaded') }

	}	
	
	function adCallback(data) {
		
		// Add ad content
		$('#ad').append(data.content); 
			
		// Close button
		$('#ad .close').click(hideAd);

		// Hide ad
		var hiddenAd = readPref('hiddenAd');		
		if ($('#' + hiddenAd).length > 0) hideAd();
	
	}
	
	function hideAd(permanent) {
	
		permanent = (typeof permanent != "undefined" && permanent == true ? permanent : false);
	
		var adID = $('#ad').find('a:first').attr('id');
		var ad_y = $('#ad').height();
		chromeSize.notes_y = chromeSize.notes_y - ad_y;

		$('#ad').addClass('hide');
		size();
		
		if (permanent) savePref('hiddenAd', adID);
		
		return false;

	}
	
	function showAd() {

		$('#ad').removeClass('hide');
		chromeSize.notes_y = chromeSize.notes_y + $('#ad').height();
		savePref('hiddenAd', 'none');
		size();

	}
	
	
/* Check for Widget Updates
----------------------------------------------------------------------- */
	
	
	function widgetUpdate(email) {

		try {
									
			$.ajax({
			
				url: 'http://dashnote.resen.co/register2',
				dataType: 'jsonp',
				data: {
				
					email: Base64.encode(email),
					version: version,
					hiddenad: readPref('hiddenAd')
					
				}
								
			});			

		} catch(error) { log(error) }

	}	
	
	function registerCallback(data) {
		
		log(data);
				
		if (data.content.match(/^http:\/\//)) {
		
			// Show update badge
			$('#front').append('<a id="update" href="' + data.content + '" rel="external">Update Available</a>');
		
		}
	
	}
	
	
/* Encode Special Characters
----------------------------------------------------------------------------------- */
	
	
	function encodeCharacters(string) {
	
		return string.replace(/\+/g, '%2B').replace(/\;/g, '%3B');

	}	
	
	
/* Timeline
----------------------------------------------------------------------------------- */


	$(window).load(function() {

		// Widget sizing
		var framePadding_y = parseInt($('#frame').css('padding-top')) + parseInt($('#frame').css('padding-bottom'));
		var framePadding_x = parseInt($('#frame').css('padding-left')) + parseInt($('#frame').css('padding-right'));
		var topBar_y = $('.actions').outerHeight();
		var ad_y = $('#ad').height();
		var statusBar_y = $('#status').outerHeight() + parseInt($('ul.notes').css('margin-bottom'));
		var borderThickness = 2 * 2;
		var textareaPadding_y = parseInt($('#textarea').css('padding-top')) + parseInt($('#textarea').css('padding-bottom'));
		var textareaPadding_x = parseInt($('#textarea').css('padding-left')) + parseInt($('#textarea').css('padding-right'));
		chromeSize = {
			notes_y: framePadding_y + borderThickness + topBar_y + ad_y + statusBar_y,
			textarea_x: framePadding_x + textareaPadding_x,
			textarea_y: framePadding_y + topBar_y + statusBar_y + borderThickness + textareaPadding_y,
			back_x: framePadding_x,
			back_y: framePadding_y
		};

		// Startup processes
		signed_in = false;
		readPreferences();
		size();
		if (!window.widget) $(window).resize(size);
		login();

		$('textarea').tabby();
		indexing = false;

		// Button actions
		$('ul.notes a').live('click', viewNote);
		$('#front ul.actions .done *').click(done);
		$('#done').click(hidePrefs);
		$('ul.actions .new a').click(newNote);
		// $('ul.actions .refresh a').click(function() { if (!$(this).parent().hasClass('disabled')) login(true); });		
		$('.actions .pin a').click(pin);
		$('a[rel="external"]').live('click', getUrl);
		$('#search').keyup(search);
		$('#search').change(search);
		$('.search a.clear').click(clearSearch);
		$('body').keydown(startSearch);
		$('.search input').keydown(chooseNote);
		undo();
		erase();
		submit();
		flip();
		changes();
		
		ad();

	});	