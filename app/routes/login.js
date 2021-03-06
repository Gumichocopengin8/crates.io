import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

import { task, waitForEvent } from 'ember-concurrency';
import window from 'ember-window-mock';

/**
 * This route will open a popup window directed at the `github-login` route.
 * After the window has opened it will wait for the window to close and
 * then evaluate whether the OAuth flow was successful.
 *
 * @see `github-authorize` route
 */
export default class LoginRoute extends Route {
  @service notifications;
  @service session;

  beforeModel(transition) {
    transition.abort();
    this.loginTask.perform();
  }

  @task(function* () {
    let windowDimensions = [
      'width=1000',
      'height=450',
      'toolbar=0',
      'scrollbars=1',
      'status=1',
      'resizable=1',
      'location=1',
      'menuBar=0',
    ].join(',');

    let win = window.open('/github_login', 'Authorization', windowDimensions);
    if (!win) {
      return;
    }

    let event = yield waitForEvent(window, 'message');
    if (event.origin !== window.location.origin || !event.data) {
      return;
    }

    let { data } = event.data;
    if (data && data.errors) {
      this.notifications.error(`Failed to log in: ${data.errors[0].detail}`);
      return;
    } else if (!event.data.ok) {
      this.notifications.error('Failed to log in');
      return;
    }

    this.session.login();
  })
  loginTask;
}
