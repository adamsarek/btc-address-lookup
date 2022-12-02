class WebSocketClient {
	host = (new URL(location.origin).hostname == 'localhost' ? location.origin.replace(/^http/, 'ws') : 'wss://btc-address-lookup.onrender.com');
	ws = null;
	
	constructor() {
		let el;
		
		// Show host
		el = document.getElementById('server-connection');
		el.innerHTML = this.host;
		
		// Disable disconnect button
		el = document.getElementById('server-disconnect-button');
		el.setAttribute('disabled','');
		
		// Disable message
		el = document.getElementById('server-message');
		el.setAttribute('disabled','');
		el.value = '';
		
		// Empty message length counter
		el = document.getElementById('server-message-length');
		el.innerHTML = '0';
		
		// Disable send button
		el = document.getElementById('server-send-button');
		el.setAttribute('disabled','');
		
		// Enable connect button
		el = document.getElementById('server-connect-button');
		el.removeAttribute('disabled');
		
		document.title = 'Disconnected (' + this.host + ')';
		el = document.getElementById('header');
		el.classList.remove('u-color--3C3');
		el.classList.add('u-color--C33');
	}
	
	open() {
		this.ws = new WebSocket(this.host);
		
		this.ws.onopen = (event) => {
			let el;
			
			// Enable connect button
			el = document.getElementById('server-connect-button');
			el.setAttribute('disabled','');
			
			// Enable disconnect button
			el = document.getElementById('server-disconnect-button');
			el.removeAttribute('disabled');
			
			// Enable message
			el = document.getElementById('server-message');
			el.removeAttribute('disabled');
			el.focus();
			
			// Enable send button
			el = document.getElementById('server-send-button');
			el.removeAttribute('disabled');
			
			document.title = 'Connected (' + this.host + ')';
			el = document.getElementById('header');
			el.classList.add('u-color--3C3');
			el.classList.remove('u-color--C33');
		};
		
		this.ws.onclose = (event) => {
			let el;
			
			// Disable disconnect button
			el = document.getElementById('server-disconnect-button');
			el.setAttribute('disabled','');
			
			// Disable message
			el = document.getElementById('server-message');
			el.setAttribute('disabled','');
			el.value = '';
			
			// Empty message length counter
			el = document.getElementById('server-message-length');
			el.innerHTML = '0';
			
			// Disable send button
			el = document.getElementById('server-send-button');
			el.setAttribute('disabled','');
			
			// Enable connect button
			el = document.getElementById('server-connect-button');
			el.removeAttribute('disabled');
			
			document.title = 'Disconnected (' + this.host + ')';
			el = document.getElementById('header');
			el.classList.remove('u-color--3C3');
			el.classList.add('u-color--C33');
		};
		
		this.ws.onerror = (event) => {
			let el;
			
			el = document.getElementById('server-error');
			el.innerHTML += (el.innerHTML.length > 0 ? '\n' + event.data : event.data);
			el.scrollTop = el.scrollHeight;
		};
		
		this.ws.onmessage = (event) => {
			let el;
			
			el = document.getElementById('server-data');
			el.innerHTML += (el.innerHTML.length > 0 ? '\n' + event.data : event.data);
			el.scrollTop = el.scrollHeight;
		};
	}
	
	close() {
		this.ws.close();
	}
	
	send() {
		let el = document.getElementById('server-message');
		
		// Send message
		this.ws.send(el.value);
		
		// Reset message
		el.value = '';
		el = document.getElementById('server-message-length');
		el.innerHTML = '0';
	}
}

let WSC = new WebSocketClient;