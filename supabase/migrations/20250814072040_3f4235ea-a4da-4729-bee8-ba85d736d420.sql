-- Policy per subscription_plans: permettere agli utenti autenticati di leggere i piani attivi
CREATE POLICY "Users can view active subscription plans" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);

-- Policy per user_subscriptions: permettere agli utenti di gestire i propri abbonamenti
CREATE POLICY "Users can view their own subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
ON public.user_subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy per credits_transactions: permettere agli utenti di leggere le proprie transazioni
CREATE POLICY "Users can view their own credit transactions" 
ON public.credits_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit transactions" 
ON public.credits_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy per profiles: aggiornare per permettere aggiornamento crediti
CREATE POLICY "Users can update their own credits" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);