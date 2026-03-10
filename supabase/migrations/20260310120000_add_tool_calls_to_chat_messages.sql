-- Add tool_calls column to store tool interactions alongside assistant messages
-- This allows Claude to see its own previous tool usage patterns in conversation history
ALTER TABLE public.chat_messages ADD COLUMN tool_calls jsonb;

-- Allow users to update their own messages (needed to attach tool_calls after streaming)
CREATE POLICY "Users can update their own messages"
ON public.chat_messages
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
