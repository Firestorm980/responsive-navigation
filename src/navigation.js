'use strict';

/**
 * Variables
 */

// This should match the query set up in our CSS.
const mq = window.matchMedia( '(min-width: 48em)' );

// We're going to be updating these later.
let settings = {};
let $menu = null;
let $menuToggle = null;
let $submenus = null;
let $menuItems = null;

/**
 * Setup
 */

/**
 * Sets up all polyfills required by the plugin.
 *
 * @returns {null} Nothing.
 */
const setupPolyfills = () => {
	// forEach on node lists
	// @source: https://developer.mozilla.org/en-US/docs/Web/API/NodeList/forEach
	if ( window.NodeList && !NodeList.prototype.forEach ) {
		NodeList.prototype.forEach = function ( callback, thisArg ) {
			thisArg = thisArg || window;
			for ( var i = 0; i < this.length; i++ ) {
				callback.call( thisArg, this[i], i, this );
			}
		};
	}

	// Custom events
	// @source: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
	if ( typeof window.CustomEvent === 'function' ) return false;

	/**
	 * Custom event function.
	 *
	 * @param   {object} event  The event object.
	 * @param   {object} params Options for the event.
	 * @returns {object}        The custom event.
	 */
	function CustomEvent ( event, params ) {
		params = params || { bubbles: false, cancelable: false, detail: undefined };
		var evt = document.createEvent( 'CustomEvent' );
		evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
		return evt;
	}

	CustomEvent.prototype = window.Event.prototype;

	window.CustomEvent = CustomEvent;
};

/**
 * Sets up the main menu for the navigation.
 * Includes adding classes and ARIA.
 * We use "scoped" classes so we can be more confident that there will be no collisions.
 *
 * @returns {null} Nothing.
 */
const setupMenu = () => {

	const id = $menu.getAttribute( 'id' );
	const href = $menuToggle.getAttribute( 'href' );
	const hrefTarget = href.replace( '#', '' );

	// Check for a valid ID on the menu.
	if ( ! id || id === '' ) {
		console.error( '10up Navigation: Target (menu) must have a valid ID attribute.' ); // eslint-disable-line
		return;
	}

	// Check that the menu toggle is set to use the menu for fallback.
	if ( hrefTarget !== id ) {
		console.warn( '10up Navigation: The menu toggle href and menu ID are not equal.' ); // eslint-disable-line
	}

	// Add classes for our plugin styles.
	$menu.classList.add( 'js-tenup-navigation__menu' );
	$menu.classList.add( 'js-tenup-navigation__menu--main' );
	$menuToggle.classList.add( 'js-tenup-navigation__menu-toggle' );

	// Add additional classes based on interaction type.
	if ( settings.sub_menu_open === 'click' ) {
		$menu.classList.add( 'js-tenup-navigation__menu--click' );
	} else {
		$menu.classList.add( 'js-tenup-navigation__menu--hover' );
	}

	// Update classes on menu items.
	$menuItems.forEach( $menuItem => {
		$menuItem.classList.add( 'js-tenup-navigation__menu-item' );
	} );

	// Update ARIA.
	$menuToggle.setAttribute( 'aria-controls', hrefTarget );

	// Sets up ARIA tags related to screen size based on our media query.
	setMQMenuA11y();
};

/**
 * Sets up the submenus.
 * Adds JS classes and initial AIRA attributes.
 *
 * @returns {null} Nothing.
 */
const setupSubMenus = () => {

	$submenus.forEach( ( $submenu, index ) => {
		const $anchor    = $submenu.previousElementSibling;
		const submenuID  = `tenUp-submenu-${index}`;

		$submenu.classList.add( 'js-tenup-navigation__menu' );
		$submenu.classList.add( 'js-tenup-navigation__menu--submenu' );

		$submenu.setAttribute( 'id', submenuID );
		$anchor.classList.add( 'js-tenup-navigation__submenu-parent-anchor' );

		// Update ARIA.
		$submenu.setAttribute( 'aria-label', 'Submenu' );
		$anchor.setAttribute( 'aria-controls', submenuID );
		$anchor.setAttribute( 'aria-haspopup', true );

		// Sets up ARIA tags related to screen size based on our media query.
		setMQSubbmenuA11y();
	} );
};

/**
 * Binds our various listeners for the plugin.
 * Includes specific element listeners as well as media query.
 *
 * @returns {null} Nothing.
 */
const setupListeners = () => {
	// Media query listener.
	// We're using this instead of resize + debounce because it should be more efficient than that combo.
	mq.addListener( setMQ );

	// Menu toggle listener.
	$menuToggle.addEventListener( 'click', listenerMenuToggleClick );

	// Submenu listeners.
	// Mainly applies to the anchors of submenus.
	$submenus.forEach( $submenu => {
		const $anchor  = $submenu.previousElementSibling;

		if ( settings.sub_menu_open === 'hover' ) {
			$anchor.addEventListener( 'focus', listenerSubmenuAnchorFocus );
		}

		$anchor.addEventListener( 'click', listenerSubmenuAnchorClick );
	} );

	// Document specific listeners.
	// Mainly used to close any open menus.
	document.addEventListener( 'click', listenerDocumentClick );
	document.addEventListener( 'keyup', listenerDocumentKeyup );
};


/**
 * Set
 */

/**
 * Sets an media query related functions when the query boundry is reached.
 *
 * @returns {null} Nothing.
 */
const setMQ = () => {
	setMQMenuA11y();
	setMQSubbmenuA11y();
};

/**
 * Sets any ARIA that changes as a result of the media query boundry being passed.
 * Specifically for the toggle and main menu.
 *
 * @returns {null} Nothing.
 */
const setMQMenuA11y = () => {

	// Large
	if ( mq.matches ) {
		$menu.setAttribute( 'aria-hidden', false );
		$menuToggle.setAttribute( 'aria-expanded', true );
		$menuToggle.setAttribute( 'aria-hidden', true );
	// Small
	} else {
		$menu.setAttribute( 'aria-hidden', true );
		$menuToggle.setAttribute( 'aria-expanded', false );
		$menuToggle.setAttribute( 'aria-hidden', false );
	}

};

/**
 * Sets an media query related functions when the query boundry is reached.
 * Specifically for submenus.
 *
 * @returns {null} Nothing.
 */
const setMQSubbmenuA11y = () => {
	$submenus.forEach( $submenu => {
		$submenu.setAttribute( 'aria-hidden', true );
	} );
};

/**
 * Opens the passed submenu.
 *
 * @param   {element} $submenu The submenu to open. Required.
 * @returns {null}             Nothing.
 */
const openSubmenu = ( $submenu ) => {
	// Open the submenu by updating ARIA and class.
	$submenu.setAttribute( 'aria-hidden', false );
	$submenu.classList.add( 'js-tenup-navigation__menu--submenu-is-open' );

	// Custom open event
	$submenu.dispatchEvent( new CustomEvent( 'tenup-navigation:submenu-open' ) );
};

/**
 * Closes the passed submenu.
 *
 * @param   {element} $submenu The submenu to close. Required.
 * @returns {null}             Nothing.
 */
const closeSubmenu = ( $submenu ) => {
	const $childSubmenus = $submenu.querySelectorAll( 'li > .js-tenup-navigation__menu--submenu-is-open' );

	// Close the submenu by updating ARIA and class.
	$submenu.setAttribute( 'aria-hidden', true );
	$submenu.classList.remove( 'js-tenup-navigation__menu--submenu-is-open' );

	if ( $childSubmenus ) {
		// Close any children as well.
		// Update their ARIA and class.
		closeSubmenus( $childSubmenus );
	}

	// Custom close event
	$submenu.dispatchEvent( new CustomEvent( 'tenup-navigation:submenu-close' ) );
};

/**
 * Closes all submenus in the node list.
 *
 * @param   {nodelist} $submenus The node list of submenus to close. Required.
 * @returns {null}               Nothing.
 */
const closeSubmenus = ( $submenus ) => {
	$submenus.forEach( $submenu => {
		closeSubmenu( $submenu );
	} );
};

/**
 * Listeners
 */

/**
 * Menu toggle handler.
 * Opens or closes the menu according to current state.
 *
 * @param {Object} event The event object.
 * @returns {null}       Nothing.
 */
const listenerMenuToggleClick = ( event ) => {
	const isExpanded = ( $menuToggle.getAttribute( 'aria-expanded' ) === 'true' );

	// Don't act like a link.
	event.preventDefault();

	// Don't bubble.
	event.stopPropagation();

	// Is the menu currently open?
	if ( isExpanded ) {

		// Update classes
		$menu.classList.remove( 'js-tenup-navigation__menu--is-open' );
		$menuToggle.classList.remove( 'js-tenup-navigation__menu-toggle--is-open' );

		// Update ARIA
		$menu.setAttribute( 'aria-hidden', true );
		$menuToggle.setAttribute( 'aria-expanded', false );

		// Custom close event
		$menu.dispatchEvent( new CustomEvent( 'tenup-navigation:menu-close' ) );
	} else {

		// Update classes
		$menu.classList.add( 'js-tenup-navigation__menu--is-open' );
		$menuToggle.classList.add( 'js-tenup-navigation__menu-toggle--is-open' );

		// Update ARIA
		$menu.setAttribute( 'aria-hidden', false );
		$menuToggle.setAttribute( 'aria-expanded', true );

		// Focus the first link in the menu
		$menu.querySelectorAll( 'a' )[0].focus();

		// Custom open event
		$menu.dispatchEvent( new CustomEvent( 'tenup-navigation:menu-open' ) );
	}
};

/**
 * Document click handler.
 * Closes all open submenus on a click outside of the menu.
 *
 * @returns {null} Nothing.
 */
const listenerDocumentClick = () => {
	const $openSubmenus = $menu.querySelectorAll( '.js-tenup-navigation__menu--submenu-is-open' );

	// Bail if no submenus are found.
	if ( ! $openSubmenus ) {
		return;
	}

	// Close the submenus.
	closeSubmenus( $openSubmenus );
};

/**
 * Document keyup handler.
 * Closes all open menus on a escape key.
 * Refocuses after closing submenus.
 *
 * @param   {Object} event The event object.
 * @returns {null}         Nothing.
 */
const listenerDocumentKeyup = ( event ) => {
	const $openSubmenus = $menu.querySelectorAll( '.js-tenup-navigation__menu--submenu-is-open' );

	// Bail early if not using the escape key or if no submenus are found.
	if ( ! $openSubmenus || event.keyCode !== 27 ) {
		return;
	}

	// Close submenus
	closeSubmenus( $openSubmenus );

	// If we're set to click, set the focus back.
	if ( settings.sub_menu_open === 'click' ) {
		$openSubmenus[0].previousElementSibling.focus();
	}
};

/**
 * Submenu anchor click handler.
 * Opens or closes the submenu accordingly.
 * Only fires based on settings and if the media query is appropriate.
 *
 * @param   {Object} event The event object. Required.
 * @returns {null}          Nothing.
 */
const listenerSubmenuAnchorClick = ( event ) => {
	const $anchor = event.target;
	const $submenu = $anchor.nextElementSibling;
	const isHidden = ( $submenu.getAttribute( 'aria-hidden' ) === 'true' );

	// Bail if set to hover and we're on a large screen.
	if ( settings.sub_menu_open === 'hover' && mq.matches ) {
		return;
	}

	// Don't let the link act like a link.
	event.preventDefault();

	// Don't bubble.
	event.stopPropagation();

	// Is the submenu hidden?
	if ( isHidden ) {
		// Yes, open it.
		openSubmenu( $submenu );
	} else {
		// No, close it.
		closeSubmenu( $submenu );
	}
};

/**
 * Submenu anchor focus handler.
 * Opens or closes the submenu accordingly.
 * Only fires based on settings and if the media query is appropriate.
 *
 * @param   {object} event The event object.
 * @returns {null}         Nothing.
 */
const listenerSubmenuAnchorFocus = ( event ) => {
	const $anchor = event.target;
	const $menuItem = $anchor.parentNode;
	const $submenu = $anchor.nextElementSibling;
	const $siblingSubmenus = $menuItem.parentNode.querySelectorAll( '.js-tenup-navigation__menu--submenu' );

	// Bail early if no submenu is found or if we're on a small screen.
	if ( ! $submenu || ! mq.matches ) {
		return;
	}

	// Close all sibling menus
	closeSubmenus( $siblingSubmenus );

	// Open this menu
	openSubmenu( $submenu );
};

/**
 * The main plugin function.
 * This is called from whatever code wants to use the plugin.
 * It sets up many of the global variables that we'll reuse later in other functions.
 * It also kicks off many of the other set up functions and does the callback specified, if any. The plugin also includes some event callbacks as well. This function has the init event.
 * There are also some included checks in order to help prevent errors in initialization.
 *
 * @param {object}   options  The options passed on init. Optional.
 * @param {function} callback A callback function to call after the plugin has initiated. Optional.
 * @returns {null}            Nothing.
 */
const navigation = ( options = {}, callback = false ) => {

	// Defaults
	const defaults = {
		'target'        : '#primary-nav',
		'toggle'        : '#js-menu-toggle',
		'sub_menu_open' : 'hover'
	};

	// Settings
	settings = Object.assign( {}, defaults, options );

	// Menu container
	$menu = document.querySelector( settings.target );

	// Bail out if there's no menu.
	if ( ! $menu ) {
		console.error( '10up Navigation: Target not found. A valid target (menu) must be used.' ); // eslint-disable-line
		return;
	}

	$menuToggle = document.querySelector( settings.toggle );

	// Also bail early if the toggle isn't set.
	if ( ! $menuToggle ) {
		console.error( '10up Navigation: No menu toggle found. A valid menu toggle must be used.' ); // eslint-disable-line
		return;
	}

	// Set all submenus and menu items.
	$submenus = $menu.querySelectorAll( 'ul' );
	$menuItems = $menu.querySelectorAll( 'li' );

	// Update the html element classes for styles.
	// Otherwise it'll fallback to :target.
	document.querySelector( 'html' ).classList.remove( 'no-js' );
	document.querySelector( 'html' ).classList.add( 'js' );

	// Setup tasks
	setupPolyfills();
	setupMenu();
	setupSubMenus();
	setupListeners();

	// Do any callbacks, if assigned.
	if ( callback && typeof callback === 'function' ) {
		callback.call();
	}

	// Fire our custom event for init.
	$menu.dispatchEvent( new CustomEvent( 'tenup-navigation:init' ) );
};

export default navigation;
