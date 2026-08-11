/**
 * The three answers, and every word the app says about them. Kept in one file
 * because the tone is the product here — if the wording drifts between the
 * check-in screen and the confirmation, the app stops sounding like one voice.
 *
 * None of these lines grade the day. "Slipped" ends the count, but it is
 * written as an observation, not a penalty.
 */
export const MOODS = {
  strong: {
    label: 'Strong',
    note: 'I held to what I meant to do.',
    confirmation: 'A day you meant, and did.',
    afterword: 'Nothing else is asked of today.',
  },
  struggling: {
    label: 'Struggling',
    note: 'It was hard, and I stayed with it.',
    confirmation: 'Hard, and you stayed with it.',
    afterword: 'That still counts. It counts more, most days.',
  },
  slipped: {
    label: 'Slipped',
    note: 'It got away from me today.',
    confirmation: 'Today got away. It happens.',
    afterword: 'The count starts again tomorrow, from one.',
  },
};

export const MOOD_ORDER = ['strong', 'struggling', 'slipped'];
