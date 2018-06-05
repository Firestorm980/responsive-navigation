// Component Scaffold

import Navigation from './navigation';

if ( window.TenUp )
	window.TenUp = [...window.TenUp];
else
	window.TenUp = [];

// Named that way in the global for backwards compatibility.
window.TenUp.navigation = Navigation;
