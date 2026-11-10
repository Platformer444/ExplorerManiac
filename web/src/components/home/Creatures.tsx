import { useState, useEffect } from "react";

function Creatures() {
    const [creatures, setCreatures] =
        useState<
            {
                creature: {
                    id: number,
                    name: string,
                    description: string,
                    rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'epic'
                },
                nickname: string | null,
                experience: number,
                caught_at: Date
            }[] | null
        >();
    useEffect(
        () => {
            fetch(
                'http://localhost:3000/users/me/creatures',
                {
                    "method": "GET",
                    "credentials": "include"
                }
            )
                .then(
                    (Data) => {
                        Data.json().then(
                            (Response) => {
                                if (!Data.ok) throw new Error(Response.error.message);
                                setCreatures(Response.data["creatures"]);
                            }
                        )
                    }
                )
                .catch(
                    (Error) => {
                        console.error(Error);
                        setCreatures(null);
                    }
                );
            return () => {};
        },
        []
    );

    return (
        <div className="flex flex-col">
            {
                !creatures || creatures?.length > 0
                    ? creatures?.map(
                        (Creature, index) => {
                            return (
                                <div key={index + "_" + Creature.creature.id} className="top-0 items-center justify-center rounded-lg bg-white/90 p-4 mb-1 mt-1 shadow-2xl backdrop-blur-md border border-white/20">
                                    {
                                        Creature.nickname || Creature.nickname === ''
                                            ? <><span className="text-slate-900 text-2xl">{Creature.nickname}</span>  <span className="text-slate-600 text-2xs">{Creature.creature.name}</span></>
                                            : <span className="text-slate-900 text-2xl">{Creature.creature.name}</span>
                                    }
                                </div>
                            );
                        }
                    )
                    : <div className="top-0 items-center justify-center rounded-lg bg-white/90 p-4 mb-1 mt-1 shadow-2xl backdrop-blur-md border border-white/20">
                        You haven't caught any Creatures!
                    </div>
            }
        </div>
    );
};

export default Creatures;