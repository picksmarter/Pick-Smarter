/**
 * Newsletter signup — posts directly to Kit's public form-subscription
 * endpoints via fetch(). No backend of our own, no API key: Kit's
 * /forms/{id}/subscriptions endpoint is designed to be called cross-origin
 * from any site (confirmed CORS: access-control-allow-origin: *) and only
 * needs an email address, no secret credential.
 *
 * "Both" isn't a real Kit list — it submits to both forms one after another
 * (not in parallel: two subscribe requests landing at the exact same
 * instant intermittently get a spurious 404 from Kit's API, confirmed by
 * testing — staggering them avoids it, and the retry below is a safety
 * net in case it isn't the whole story).
 */

const KIT_FORM_IDS = {
  college: '9844756',
  nfl: '9844769',
};

function kitSubscribe(formId, email) {
  return fetch(`https://app.kit.com/forms/${formId}/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({ email_address: email }),
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function kitSubscribeWithRetry(formId, email) {
  let res = await kitSubscribe(formId, email);
  if (!res.ok) {
    await wait(600);
    res = await kitSubscribe(formId, email);
  }
  return res;
}

async function subscribeToForms(formIds, email) {
  const results = [];
  for (let i = 0; i < formIds.length; i++) {
    if (i > 0) await wait(400); // stagger — see note above
    results.push(await kitSubscribeWithRetry(formIds[i], email));
  }
  return results;
}

function targetFormIds(listChoice) {
  if (listChoice === 'both') return [KIT_FORM_IDS.college, KIT_FORM_IDS.nfl];
  if (listChoice === 'nfl') return [KIT_FORM_IDS.nfl];
  return [KIT_FORM_IDS.college];
}

function showResult(form, kind, message) {
  let result = form.querySelector('.newsletter-result');
  if (!result) {
    result = document.createElement('p');
    result.className = 'newsletter-result';
    result.setAttribute('role', 'status');
    form.appendChild(result);
  }
  result.hidden = false;
  result.className = `newsletter-result newsletter-result--${kind}`;
  result.textContent = message;
}

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-kit-signup-form]').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailInput = form.querySelector('input[type="email"]');
        const email = emailInput.value.trim();
        const listChoice = (form.querySelector('input[name="list"]:checked') || {}).value || 'college';
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';

        const formIds = targetFormIds(listChoice);

        try {
          const results = await subscribeToForms(formIds, email);
          const failures = results.filter((res) => !res.ok);

          if (failures.length === 0) {
            showResult(form, 'success', 'Success! Check your email to confirm your subscription.');
            emailInput.value = '';
          } else if (failures.length < results.length) {
            showResult(
              form,
              'error',
              'Partially signed up — one list failed. Please try again in a moment to make sure you get both.'
            );
          } else {
            showResult(form, 'error', 'Something went wrong. Please try again in a moment.');
          }
        } catch (err) {
          showResult(form, 'error', 'Something went wrong. Please try again in a moment.');
          // eslint-disable-next-line no-console
          console.error('Newsletter signup failed:', err);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      });
    });
  });
})();
