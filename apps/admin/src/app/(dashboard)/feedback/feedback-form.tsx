"use client";

import { useActionState } from "react";
import { submitFeedback, type FeedbackFormState } from "./actions";

const initialState: FeedbackFormState = {};

export function FeedbackForm() {
  const [state, formAction, pending] = useActionState(submitFeedback, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          What do you need? *
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="e.g. I need to upload exercise PDFs"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-700 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="body" className="block text-sm font-medium text-gray-700">
          Details
        </label>
        <textarea
          id="body"
          name="body"
          rows={3}
          placeholder="How would this help you run the clinic?"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-700 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue="workflow"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="workflow">Workflow</option>
            <option value="feature_request">Feature request</option>
            <option value="bug">Something broken</option>
            <option value="general">General</option>
          </select>
        </div>
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue="medium"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-green-700">Thank you — received.</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-900 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Submit feedback"}
      </button>
    </form>
  );
}
