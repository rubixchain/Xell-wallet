import { useContext } from "react"
import { UserContext } from "../context/userContext"
import { Navigate } from "react-router-dom"
import { routes } from "./routes"
import Requests from "../components/Requests"


export default function ProtectedRoute({ children }) {

    const { isUserLoggedIn, websiteInitiated } = useContext(UserContext)

    if (websiteInitiated) {
        return <Requests />
    }


    return <>{children}</>

}