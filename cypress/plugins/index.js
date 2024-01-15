/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

require('dotenv').config();
const webpackPreprocessor = require('@cypress/webpack-preprocessor');
const webpackOptions = require('../webpack.config.js');

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
module.exports = (on, config) => {
	on('before:browser:launch', (browser, launchOptions) => {
		if (browser.family === 'firefox') {
			// launchOptions.preferences is a map of preference names to values
			// login is not working in firefox when testing_localhost_is_secure_when_hijacked is false
			launchOptions.preferences['network.proxy.testing_localhost_is_secure_when_hijacked'] = true;
		}

		return launchOptions;
	});

	on('file:preprocessor', webpackPreprocessor({ webpackOptions }));

	config.env.TEST_ACCOUNT_PK = process.env.TEST_ACCOUNT_PK;
	config.env.TEST_ACCOUNT_WALLET = process.env.TEST_ACCOUNT_WALLET;

	return config;
};
