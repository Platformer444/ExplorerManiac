import React, { useState } from "react";
import Profile from "./Profile";
import Creatures from "./Creatures";

const __STYLE_TAB = {
    tab: 'group flex flex-col justify-center items-center relative p-2 rounded-[5px] transition-color duration-400 ease-out m-1 w-16 h-16 hover:bg-slate-200',
    icon: 'text-slate-500 group-hover:text-slate-600',
    text: 'text-[10px] text-black/80 group-hover:text-black'
};

const TABS_LIST = [
    { id: 'creatures', name: 'Creatures', icon: 'fi fi-br-paw', element: Creatures },
    {
        id: 'home', name: 'Home', icon: 'fi fi-br-home',
        element: () => {
            return (
                <>
                Map
                </>
            );
        }
    },
    { id: 'profile', name: 'Profile', icon: 'fi fi-br-user', element: Profile }
];

function Home(
    { user }: {
        user: {
            id: string,
            username: string,
            display_name: string,
            created_at: Date
        }
    }
) {
    const [activeTab, setActiveTab] = useState<typeof TABS_LIST[number]["id"]>("home");
    const Active = (Event: React.MouseEvent<HTMLButtonElement>) => {
        Event.preventDefault();
        if (activeTab !== Event.currentTarget.getAttribute('id')) return setActiveTab(Event.currentTarget.getAttribute('id')!);
        else return;
    };

    return (
        <>
            <div className="relative w-screen h-screen flex items-center justify-center">
                {
                    TABS_LIST.map(
                        (Tab) => {
                            return (
                                <div
                                    key={Tab.id} id={Tab.id}
                                    className={
                                        "absolute inset-0 bg-slate-200 justify-center items-center flex" + " " +
                                        (activeTab == Tab.id
                                            ? "block"
                                            : "hidden")
                                    }
                                >
                                    <Tab.element user={user} />
                                </div>
                            );
                        }
                    )
                }
                <div id="dashboard" className="flex flex-row items-center justify-center absolute bottom-5 z-10 overflow-y-auto rounded-[10px] bg-white/90 p-1 shadow-xl backdrop-blur-md border border-white/20">
                    {
                        TABS_LIST.map(
                            (Tab) => {
                                return (
                                    <button
                                        onClick={Active} id={Tab.id} key={Tab.id}
                                        className={
                                            __STYLE_TAB.tab + " " +
                                            (activeTab === Tab.id
                                                ? "bg-slate-300"
                                                : "bg-transparent")
                                        }
                                    >
                                        <i className={__STYLE_TAB.icon + " " + Tab.icon}></i>
                                        <span className={__STYLE_TAB.text}>{Tab.name}</span>
                                    </button>
                                );
                            }
                        )
                    }
                </div>
            </div>
        </>
    )
};

export default Home;