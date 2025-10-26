import React from 'react';
import ActivityFeed from '../components/ActivityFeed';
import WeeklyTrendChart from '../components/WeeklyTrendChart';

const DashboardPage: React.FC = () => {
    return (
        <div style={{direction: 'rtl'}} className="space-y-12">
            <div>
                <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">داشبورد مدیریتی</h1>
            </div>

            <WeeklyTrendChart />

            <ActivityFeed />
        </div>
    );
};

export default DashboardPage;
