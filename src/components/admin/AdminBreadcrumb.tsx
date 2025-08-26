import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export const AdminBreadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const breadcrumbMap: { [key: string]: string } = {
    admin: 'Admin',
    users: 'Utenti',
    gyms: 'Palestre',
    'gym-applications': 'Candidature Palestre',
  };

  const generateBreadcrumbs = () => {
    const breadcrumbs = [];
    let currentPath = '';

    // Add root admin breadcrumb
    breadcrumbs.push(
      <BreadcrumbItem key="admin">
        <BreadcrumbLink asChild>
          <Link to="/admin">Admin</Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
    );

    // Process the rest of the path
    for (let i = 1; i < pathnames.length; i++) {
      const pathname = pathnames[i];
      currentPath += `/${pathname}`;
      const fullPath = `/admin${currentPath}`;
      const isLast = i === pathnames.length - 1;
      const displayName = breadcrumbMap[pathname] || pathname;

      if (i > 1) {
        breadcrumbs.push(<BreadcrumbSeparator key={`sep-${i}`} />);
      }

      if (isLast) {
        breadcrumbs.push(
          <BreadcrumbItem key={pathname}>
            <BreadcrumbPage>{displayName}</BreadcrumbPage>
          </BreadcrumbItem>
        );
      } else {
        breadcrumbs.push(
          <BreadcrumbSeparator key={`sep-${i}`} />,
          <BreadcrumbItem key={pathname}>
            <BreadcrumbLink asChild>
              <Link to={fullPath}>{displayName}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        );
      }
    }

    return breadcrumbs;
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {generateBreadcrumbs()}
      </BreadcrumbList>
    </Breadcrumb>
  );
};