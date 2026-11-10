import { useNavigate } from "react-router";

function Profile(
    { user }: {
        user: {
            id: string,
            username: string,
            display_name: string,
            created_at: Date
        } | null
    }
) {    
    const Navigate = useNavigate();
    const Edit = async (Event: React.MouseEvent<HTMLButtonElement>) => {
        Event.preventDefault();

        await fetch(
            'http://localhost:3000/users/edit',
            {
                method: "POST",
                credentials: "include",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(
                    {
                        username: user?.username,
                        display_name: "Hi"
                    }
                )
            }
        )
            .then(
                (Data) => {
                    return Data.json().then(
                        (Response) => {
                            if (!Data.ok) throw Error(Response.error.message);
                            return window.location.reload();
                        }
                    )
                }
            )
            .catch(
                (Error) => {
                    console.error(Error);
                }
            )
    };
    const Logout = async (Event: React.MouseEvent<HTMLButtonElement>) => {
        Event.preventDefault();

        await fetch(
            'http://localhost:3000/users/logout',
            {
                method: "POST",
                credentials: "include",
            }
        )
            .then(
                (Data) => {
                    if (!Data.ok) throw Error("Error");
                    return Navigate('/login');
                }
            )
            .catch(
                (Error) => {
                    console.error(Error);
                }
            );
    };

    return (
        <>
            <div className="items-center justify-center absolute w-150 top-10 rounded-lg bg-white/90 p-8 shadow-2xl backdrop-blur-md border border-white/20">
                <button onClick={Logout} id="logout" className="transition-color duration-400 ease-out group bg-white/30 border-red-400 border-2 rounded-[5px] absolute -top-4 -right-5 p-1 w-9 h-9 hover:bg-red-400">
                    <i className="fi fi-br-power text-red-400 group-hover:text-white transition-color duration-400 ease-out"></i>
                </button>
                <span className="group">
                    <span className="text-5xl mr-2">{user?.display_name}</span>
                    <button onClick={Edit} id="edit">
                        <i className="fi fi-br-pencil text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-500"></i>
                    </button>
                </span>
                <br />
                <span className="text-2xs text-slate-600">@{user?.username}</span>
            </div>
        </>
    );
}

export default Profile;