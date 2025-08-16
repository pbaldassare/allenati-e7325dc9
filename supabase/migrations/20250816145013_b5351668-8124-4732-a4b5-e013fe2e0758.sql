-- Fix RLS policies for bookings table - allow gym owners to update bookings
CREATE POLICY "Gym owners can update their gym bookings" 
ON public.bookings 
FOR UPDATE 
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND course_id IN (
  SELECT id FROM public.courses WHERE gym_id = get_user_gym_id(auth.uid())
));

-- Add missing RLS policies for critical tables to fix linter issues

-- Profiles table - gym owners can update member profiles
CREATE POLICY "Gym owners can update gym member profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND EXISTS (
  SELECT 1 FROM public.user_gym_memberships ugm 
  WHERE ugm.user_id = profiles.user_id 
    AND ugm.gym_id = get_user_gym_id(auth.uid()) 
    AND ugm.status = 'active'
));

-- Credits transactions - gym owners can view their gym member transactions
CREATE POLICY "Gym owners can view gym member credit transactions" 
ON public.credits_transactions 
FOR SELECT 
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND user_id IN (
  SELECT ugm.user_id FROM public.user_gym_memberships ugm 
  WHERE ugm.gym_id = get_user_gym_id(auth.uid()) 
    AND ugm.status = 'active'
));

-- Gym owners can create credit transactions for refunds
CREATE POLICY "Gym owners can create credit transactions for their gym members" 
ON public.credits_transactions 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'gym_owner'::app_role) AND user_id IN (
  SELECT ugm.user_id FROM public.user_gym_memberships ugm 
  WHERE ugm.gym_id = get_user_gym_id(auth.uid()) 
    AND ugm.status = 'active'
));

-- User subscriptions - gym owners can view their gym member subscriptions
CREATE POLICY "Gym owners can view gym member subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND user_id IN (
  SELECT ugm.user_id FROM public.user_gym_memberships ugm 
  WHERE ugm.gym_id = get_user_gym_id(auth.uid()) 
    AND ugm.status = 'active'
));

-- Medical certificates - missing policies (already exist but adding instructors)
CREATE POLICY "Instructors can view certificates for their gym members" 
ON public.medical_certificates 
FOR SELECT 
USING (has_role(auth.uid(), 'instructor'::app_role) AND gym_id = get_user_gym_id(auth.uid()));

-- User preferences - users can view their own preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admin policies for user preferences
CREATE POLICY "Admins can manage all user preferences" 
ON public.user_preferences 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Products table policies
CREATE POLICY "Users can view active products" 
ON public.products 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all products" 
ON public.products 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Orders policies
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all orders" 
ON public.orders 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Order items policies
CREATE POLICY "Users can view their order items" 
ON public.order_items 
FOR SELECT 
USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all order items" 
ON public.order_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Shopping cart policies
CREATE POLICY "Users can view their own cart" 
ON public.shopping_cart 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cart" 
ON public.shopping_cart 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payments" 
ON public.payments 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Points transactions policies
CREATE POLICY "Users can view their own points transactions" 
ON public.points_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own points transactions" 
ON public.points_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Achievements policies
CREATE POLICY "Users can view all active achievements" 
ON public.achievements 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all achievements" 
ON public.achievements 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- User achievements policies
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Mobile notifications policies
CREATE POLICY "Users can view their own notifications" 
ON public.mobile_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.mobile_notifications 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications" 
ON public.mobile_notifications 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- App content policies
CREATE POLICY "Users can view active app content" 
ON public.app_content 
FOR SELECT 
USING (is_active = true AND (valid_from IS NULL OR valid_from <= now()) AND (valid_until IS NULL OR valid_until >= now()));

CREATE POLICY "Admins can manage all app content" 
ON public.app_content 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin settings policies
CREATE POLICY "Admins can manage admin settings" 
ON public.admin_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin action logs policies
CREATE POLICY "Admins can view all action logs" 
ON public.admin_action_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create action logs" 
ON public.admin_action_logs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Financial reports policies
CREATE POLICY "Admins can manage financial reports" 
ON public.financial_reports 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Booking history policies
CREATE POLICY "Users can view their own booking history" 
ON public.booking_history 
FOR SELECT 
USING (booking_id IN (SELECT id FROM public.bookings WHERE user_id = auth.uid()));

CREATE POLICY "Gym owners can view their gym booking history" 
ON public.booking_history 
FOR SELECT 
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND booking_id IN (
  SELECT b.id FROM public.bookings b 
  JOIN public.courses c ON b.course_id = c.id 
  WHERE c.gym_id = get_user_gym_id(auth.uid())
));

CREATE POLICY "Admins can manage all booking history" 
ON public.booking_history 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff schedules policies
CREATE POLICY "Staff can view their own schedules" 
ON public.staff_schedules 
FOR SELECT 
USING (auth.uid() = staff_id);

CREATE POLICY "Gym owners can manage their gym staff schedules" 
ON public.staff_schedules 
FOR ALL 
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND staff_id IN (
  SELECT ugm.user_id FROM public.user_gym_memberships ugm 
  WHERE ugm.gym_id = get_user_gym_id(auth.uid())
));

CREATE POLICY "Admins can manage all staff schedules" 
ON public.staff_schedules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- User activity tracking policies
CREATE POLICY "Users can view their own activity" 
ON public.user_activity_tracking 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity" 
ON public.user_activity_tracking 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user activity" 
ON public.user_activity_tracking 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Role permissions policies
CREATE POLICY "Users can view role permissions" 
ON public.role_permissions 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage role permissions" 
ON public.role_permissions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Permissions policies
CREATE POLICY "Users can view permissions" 
ON public.permissions 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage permissions" 
ON public.permissions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));