import { useNavigate } from "react-router";

function Login() {
    const Navigate = useNavigate();
    const Login = async (Event: any) => {
        Event.preventDefault();

        const LoginData = new FormData(Event.target);

        await fetch(
            'http://localhost:3000/users/login',
            {
                method: 'POST',
                credentials: "include",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(
                    {
                        username: LoginData.get('username'),
                        password: LoginData.get('password')
                    }
                )
            }
        )
            .then(
                (Data) => {
                    return Data.json().then(
                        (Response) => {
                            if (!Data.ok) throw new Error(Response.error.message || "Error");
                            return Response;
                        }
                    )
                }
            )
            .then(
                (Response) => {
                    Navigate('../');
                }
            )
            .catch(
                (Error) => {
                    console.error(Error);
                }
            );
    };

    return (
        <div>
            <form onSubmit={Login}>
                <input name="username"></input> <br />
                <input name="password" type="password"></input> <br />
                <button type="submit">Login</button>
            </form>
        </div>
    );
}

export default Login;