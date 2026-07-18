"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Card, Field, Input, Select, Textarea, useToast } from "@bodybalance/ui";
import { submitFeedback, type FeedbackFormState } from "./actions";

const initialState: FeedbackFormState = {};

export function FeedbackForm() {
  const [state, formAction, pending] = useActionState(submitFeedback, initialState);
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast("Thank you — received.");
      formRef.current?.reset();
    }
  }, [state, toast]);

  return (
    <Card className="p-5 md:p-6">
      <form ref={formRef} action={formAction} className="space-y-4">
        <Field label="What do you need?" htmlFor="title">
          <Input
            id="title"
            name="title"
            required
            placeholder="e.g. I need to upload exercise PDFs"
          />
        </Field>
        <Field
          label="Details"
          htmlFor="body"
          hint="How would this help you run the clinic?"
        >
          <Textarea id="body" name="body" rows={3} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" htmlFor="category">
            <Select id="category" name="category" defaultValue="workflow">
              <option value="workflow">Workflow</option>
              <option value="feature_request">Feature request</option>
              <option value="bug">Something broken</option>
              <option value="general">General</option>
            </Select>
          </Field>
          <Field label="Priority" htmlFor="priority">
            <Select id="priority" name="priority" defaultValue="medium">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </Field>
        </div>

        {state.error ? (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" loading={pending}>
          Submit feedback
        </Button>
      </form>
    </Card>
  );
}
