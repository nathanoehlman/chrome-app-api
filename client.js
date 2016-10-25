var Promise = require('es6-promise').Promise;
var cuid = require('cuid');

module.exports = function(opts) {

	if (!opts.appId) throw new Error('An Chrome app/extension ID must be provided');
	if (!opts.service) throw new Error('A Chrome service must be provided');

	var requests = {};
	var port = chrome.runtime.connect(opts.appId);
	var connected = false;
	var timeout = 5000;

	function sendRequest(command) {
		if (!command) return Promise.reject('Invalid command');

		var args = Array.prototype.slice.bind(arguments)(1);
		return new Promise(function(resolve, reject) {
			var id = cuid();

			requests[id] = {
				resolve: resolve, reject: reject
			}

			requests[id].timeout = setTimeout(function() {
				delete requests[id];
				reject('Timed out');
			}, timeout);

			port.postMessage({
				id: id,
				command: command,
				args: JSON.stringify(args || [])
			});
		});
	}

	port.onMessage.addListener(function(msg) {
		if (!msg || !msg.responseTo) return;

		var request = requests[msg.responseTo];
		if (!request) return;
		clearTimeout(request.timeout);
		delete requests[msg.responseTo];

		if (msg.ok) {
			request.resolve(msg.response);
		} else {
			request.reject(msg.error);
		}
	});

	function installed() {
		if (connected) return Promise.resolve();
		return sendRequest('installed').then(function() {
			connected = true;
			return connected;
		}).catch(function() {
			connected = false;
			return connected;
		});
	}

	return {
		installed: installed,
		execute: sendRequest
	};
}