"use client";

import { useState, useEffect } from "react";
import { campaignsClient } from "@/lib/campaigns/campaigns-client";
import { CampaignList } from "./CampaignList";
import { CampaignForm } from "./CampaignForm";
import { CampaignViewDetail } from "./CampaignViewDetail";
import { CampaignListSkeleton } from "./CampaignListSkeleton";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function CampaignManager() {
  const [view, setView] = useState<'list' | 'form' | 'view'>('list');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (view === 'list') {
      loadCampaigns();
    }
  }, [view]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await campaignsClient.getCampaigns();
      setCampaigns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedCampaign(null);
    setView('form');
  };

  const handleEdit = (campaign: any) => {
    setSelectedCampaign(campaign);
    setView('form');
  };

  const handleView = (campaign: any) => {
    setSelectedCampaign(campaign);
    setView('view');
  };

  const handleClone = (campaign: any) => {
    const cloned = { ...campaign };
    delete cloned.id;
    delete cloned.created_at;
    cloned.name = `${campaign.name} (Cópia)`;
    cloned.status = 'draft';
    setSelectedCampaign(cloned);
    setView('form');
  };

  if (loading && view === 'list') {
    return <CampaignListSkeleton />;
  }

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.3
  };

  return (
    <div className="w-full relative min-h-[600px]">
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div 
            key="list"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="flex flex-col gap-4 w-full"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Comunicados e Campanhas</h2>
              <Button color="primary" style={{ backgroundColor: '#44735e' }} startContent={<Plus className="w-4 h-4" />} onPress={handleCreate}>
                Nova Campanha
              </Button>
            </div>
            <CampaignList 
              campaigns={campaigns} 
              onEdit={handleEdit} 
              onView={handleView} 
              onClone={handleClone}
              onRefresh={loadCampaigns} 
            />
          </motion.div>
        )}

        {view === 'form' && (
          <motion.div 
            key="form"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="w-full"
          >
            <CampaignForm 
              initialData={selectedCampaign} 
              onBack={() => setView('list')} 
              onSave={() => {
                setView('list');
              }}
            />
          </motion.div>
        )}

        {view === 'view' && (
          <motion.div 
            key="view"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="w-full"
          >
            <CampaignViewDetail 
              campaign={selectedCampaign} 
              onBack={() => setView('list')} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
