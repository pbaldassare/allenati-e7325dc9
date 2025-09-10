import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerGym } from '@/contexts/OwnerGymContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, RefreshCw } from 'lucide-react';

export const DebugDataComponent: React.FC = () => {
  const { selectedGym } = useOwnerGym();
  const [isOpen, setIsOpen] = useState(false);
  const [debugData, setDebugData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const fetchDebugData = async () => {
    if (!selectedGym?.id) return;

    setLoading(true);
    try {
      // Query 1: All memberships for this gym
      const { data: allMemberships, count: allCount } = await supabase
        .from('user_gym_memberships')
        .select('*', { count: 'exact' })
        .eq('gym_id', selectedGym.id);

      // Query 2: Active memberships only
      const { data: activeMemberships, count: activeCount } = await supabase
        .from('user_gym_memberships')
        .select('*', { count: 'exact' })
        .eq('gym_id', selectedGym.id)
        .eq('status', 'active');

      // Query 3: All subscriptions for this gym
      const { data: allSubscriptions, count: subCount } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact' })
        .eq('gym_id', selectedGym.id);

      // Query 4: Active subscriptions only
      const { data: activeSubscriptions, count: activeSubCount } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact' })
        .eq('gym_id', selectedGym.id)
        .eq('status', 'active');

      // Query 5: Combat Lab specific check
      const combatLabId = '8abc8f4d-4260-4850-a0d0-b1ada1265701';
      const { data: combatLabMemberships, count: combatLabCount } = await supabase
        .from('user_gym_memberships')
        .select('*', { count: 'exact' })
        .eq('gym_id', combatLabId)
        .eq('status', 'active');

      setDebugData({
        selectedGym: {
          id: selectedGym.id,
          name: selectedGym.name
        },
        memberships: {
          all: { count: allCount, data: allMemberships?.slice(0, 3) },
          active: { count: activeCount, data: activeMemberships?.slice(0, 3) }
        },
        subscriptions: {
          all: { count: subCount, data: allSubscriptions?.slice(0, 3) },
          active: { count: activeSubCount, data: activeSubscriptions?.slice(0, 3) }
        },
        combatLabCheck: {
          id: combatLabId,
          isSelected: selectedGym.id === combatLabId,
          count: combatLabCount,
          data: combatLabMemberships?.slice(0, 3)
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Debug query error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGym?.id) {
      fetchDebugData();
    }
  }, [selectedGym?.id]);

  if (!selectedGym) return null;

  return (
    <Card className="border-2 border-amber-200 bg-amber-50/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-amber-50/30">
            <CardTitle className="flex items-center justify-between text-amber-800">
              <span className="flex items-center gap-2">
                🐛 Debug Data - {selectedGym.name}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchDebugData();
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 text-xs font-mono">
            {debugData.selectedGym && (
              <div className="space-y-2">
                <div className="font-bold text-sm">🏢 Selected Gym:</div>
                <div>ID: {debugData.selectedGym.id}</div>
                <div>Name: {debugData.selectedGym.name}</div>
                
                <div className="font-bold text-sm mt-4">👥 Memberships:</div>
                <div>All: {debugData.memberships?.all?.count} records</div>
                <div>Active: {debugData.memberships?.active?.count} records</div>
                
                <div className="font-bold text-sm mt-4">💳 Subscriptions:</div>
                <div>All: {debugData.subscriptions?.all?.count} records</div>
                <div>Active: {debugData.subscriptions?.active?.count} records</div>
                
                <div className="font-bold text-sm mt-4">🥊 Combat Lab Check:</div>
                <div>Is Selected: {debugData.combatLabCheck?.isSelected ? '✅' : '❌'}</div>
                <div>Active Members: {debugData.combatLabCheck?.count}</div>
                
                <div className="text-xs text-muted-foreground mt-4">
                  Last updated: {debugData.timestamp && new Date(debugData.timestamp).toLocaleString()}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};