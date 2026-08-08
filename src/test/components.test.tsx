import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RiskGauge } from '../components/common/RiskGauge';
import { MetricCard } from '../components/common/MetricCard';
import { AgentStatusBadge } from '../components/common/AgentStatusBadge';
import { ShapWaterfall } from '../components/common/ShapWaterfall';
import { Activity } from 'lucide-react';
import { AgentMetric, ShapFactor } from '../types';

describe('React UI Components (Testing Library)', () => {
  it('RiskGauge renders risk score, tier badge, and confidence percentage', () => {
    render(
      <RiskGauge
        score={88}
        tier="CRITICAL"
        confidence={0.96}
        size="lg"
        showLabel={true}
      />
    );

    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText(/CRITICAL/)).toBeInTheDocument();
    expect(screen.getByText('96% AI Confidence')).toBeInTheDocument();
  });

  it('MetricCard renders title, value, badge, and trend information', () => {
    render(
      <MetricCard
        title="Total Loss Prevented"
        value="$2,840,000"
        subtitle="184 Fraud Interceptions"
        trend={{ value: '+14.2%', isPositive: true, label: 'vs last month' }}
        icon={Activity}
        badge="Live"
      />
    );

    expect(screen.getByText('Total Loss Prevented')).toBeInTheDocument();
    expect(screen.getByText('$2,840,000')).toBeInTheDocument();
    expect(screen.getByText('184 Fraud Interceptions')).toBeInTheDocument();
    expect(screen.getByText('+14.2%')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('AgentStatusBadge displays agent metadata and responds to click interactions', () => {
    const mockMetric: AgentMetric = {
      id: 'compliance',
      name: 'Compliance Agent',
      role: 'Enforces AML/BSA screening and sanctions',
      status: 'completed',
      executionTimeMs: 18,
      confidence: 0.99,
      summary: 'Clean compliance clearance.',
    };

    const handleClick = vi.fn();

    render(
      <AgentStatusBadge
        metric={mockMetric}
        onClick={handleClick}
        isActive={true}
      />
    );

    expect(screen.getByText('Compliance Agent')).toBeInTheDocument();
    expect(screen.getByText('18ms execution')).toBeInTheDocument();

    const badge = screen.getByText('Compliance Agent').closest('div');
    if (badge) {
      fireEvent.click(badge);
      expect(handleClick).toHaveBeenCalled();
    }
  });

  it('ShapWaterfall renders positive and negative SHAP feature impact bars', () => {
    const sampleFactors: ShapFactor[] = [
      {
        feature: 'geo_velocity_anomaly',
        displayName: 'Impossible Travel / Foreign Geo',
        category: 'Location',
        value: '9,800 km from residence',
        impactScore: 32,
        isSuspicious: true,
        explanation: 'Physical location represents impossible speed.',
      },
      {
        feature: 'payment_channel_security',
        displayName: '3D Secure 2.2 Authenticated',
        category: 'Transaction',
        value: 'Biometric 3DS Verified',
        impactScore: -25,
        isSuspicious: false,
        explanation: 'Full liability shift.',
      }
    ];

    render(
      <ShapWaterfall
        factors={sampleFactors}
        baseScore={50}
        finalScore={57}
      />
    );

    expect(screen.getByText('Impossible Travel / Foreign Geo')).toBeInTheDocument();
    expect(screen.getByText('3D Secure 2.2 Authenticated')).toBeInTheDocument();
    expect(screen.getByText('+32')).toBeInTheDocument();
    expect(screen.getByText('-25')).toBeInTheDocument();
  });
});
