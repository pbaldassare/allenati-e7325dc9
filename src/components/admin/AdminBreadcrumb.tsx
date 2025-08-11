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
import { getAdminPath, isAdminSubdomain, isCustomAdminDomain } from '@/utils/subdomain';

export const AdminBreadcrumb = () => {
  const location = useLocation();
  const isOnAdminDomain = isAdminSubdomain() || isCustomAdminDomain();
  
  // Su domini admin custom, il path non inizia con /admin/
  const pathnames = location.pathname.split('/').filter((x) => x);
  const adminPathnames = isOnAdminDomain && !pathnames.includes('admin') 
    ? pathnames 
    : pathnames.slice(pathnames.indexOf('admin') + 1);

  const breadcrumbMap: { [key: string]: string } = {
    admin: 'Admin',
    courses: 'Corsi',
    new: 'Nuovo Corso',
    edit: 'Modifica',
    instructors: 'Istruttori',
    rooms: 'Sale',
    schedule: 'Calendario',
    'medical-certificates': 'Certificati Medici',
  };

  const generateBreadcrumbs = () => {
    const breadcrumbs = [];
    let currentPath = '';

    // Add root admin breadcrumb
    const adminRootPath = getAdminPath("");
    breadcrumbs.push(
      <BreadcrumbItem key="admin">
        <BreadcrumbLink asChild>
          <Link to={adminRootPath}>Admin</Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
    );

    // Process the admin path segments
    for (let i = 0; i < adminPathnames.length; i++) {
      const pathname = adminPathnames[i];
      currentPath += `/${pathname}`;
      const fullPath = getAdminPath(currentPath);
      const isLast = i === adminPathnames.length - 1;
      const displayName = breadcrumbMap[pathname] || pathname;

      if (i > 0) {
        breadcrumbs.push(<BreadcrumbSeparator key={`sep-${i}`} />);
      }

      if (isLast) {
        breadcrumbs.push(
          <BreadcrumbSeparator key={`sep-${i + 1}`} />,
          <BreadcrumbItem key={pathname}>
            <BreadcrumbPage>{displayName}</BreadcrumbPage>
          </BreadcrumbItem>
        );
      } else {
        breadcrumbs.push(
          <BreadcrumbSeparator key={`sep-${i + 1}`} />,
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